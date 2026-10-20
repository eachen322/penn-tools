// POST /tools/askpenn/stream — sends a message and streams AskPenn's reply
//
// Body: { chatId: string | null, provider, tier?, reasoning?, content }; tier
// and reasoning default to AskPenn's (fast, low). The response is
// server-sent events: { type: "chat", chatId } first (the new chat's id when
// chatId was null), then the reply's { type: "text", delta } events and a
// final { type: "done", result }, or { type: "error", error } if it fails.

import type { NextRequest } from "next/server";
import { isAIError } from "@penntools/core/ai";
import type { AIProvider, AIReasoning, AITier } from "@penntools/core/ai";
import { toolSql } from "@penntools/platform/db";
import { ChatNotFoundError, checkRequest, sendMessage } from "@penntools/tool-askpenn";
import { getAI } from "@/lib/ai";
import { getCurrentUser, signInRequired } from "@/lib/auth";

export async function POST(req: NextRequest): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return signInRequired();

  const sql = toolSql("askpenn");
  if (!sql) return Response.json({ error: "AskPenn's database is not configured." }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const problem = checkRequest(body ?? {});
  if (problem) return Response.json({ error: problem }, { status: 400 });
  const { chatId, provider, tier, reasoning, content } = body as {
    chatId?: string | null;
    provider: AIProvider;
    tier?: AITier;
    reasoning?: AIReasoning;
    content: string;
  };

  const events = sendMessage({
    sql,
    ai: (await getAI())!,
    userId: user.id,
    chatId: chatId ?? null,
    provider,
    ...(tier && { tier }),
    ...(reasoning && { reasoning }),
    content,
    signal: req.signal,
  });

  // The first event comes after the chat is checked and the message saved, so
  // an unknown chat can still get a proper 404.
  let first: IteratorResult<unknown>;
  try {
    first = await events.next();
  } catch (error) {
    if (error instanceof ChatNotFoundError) return Response.json({ error: "Chat not found." }, { status: 404 });
    throw error;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        if (!first.done) send(first.value);
        for await (const event of events) send(event);
      } catch (error) {
        if (req.signal.aborted) return; // the browser went away; nothing to report
        if (isAIError(error)) {
          send({ type: "error", error: error.toJSON() });
        } else {
          console.error("[askpenn] reply failed", error);
          send({ type: "error", error: { kind: "unavailable", provider, message: "Something went wrong. Try again." } });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed because the browser disconnected
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}
