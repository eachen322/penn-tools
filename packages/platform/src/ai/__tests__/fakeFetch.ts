// A stand-in for the network: both provider SDKs call the global fetch, so
// tests queue replies here and inspect the requests the adapters sent.

import { vi } from "vitest";

export interface SentRequest {
  url: URL;
  headers: Headers;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

/** One server-sent event; its `type` is also sent as the SSE event name. */
export type FakeEvent = { type: string; [field: string]: unknown };

export interface FakeReply {
  status?: number;
  json?: unknown;
  /** Server-sent events: each becomes "event: <type>\ndata: <json>". */
  events?: FakeEvent[];
  /** Drop the connection after sending the events, as a network failure would. */
  drop?: boolean;
}

export function installFakeFetch() {
  const sent: SentRequest[] = [];
  const replies: FakeReply[] = [];

  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    sent.push({ url, headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const reply = replies.shift();
    if (!reply) throw new Error(`No fake reply queued for ${url}`);

    if (reply.events) {
      const text = reply.events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
      let sentEvents = false;
      const body = reply.drop
        ? new ReadableStream({
            // Deliver the events, then fail the next read (erroring right away
            // would discard the events still queued).
            pull(controller) {
              if (sentEvents) return controller.error(new TypeError("terminated"));
              sentEvents = true;
              controller.enqueue(new TextEncoder().encode(text));
            },
          })
        : text;
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    }
    return new Response(JSON.stringify(reply.json), {
      status: reply.status ?? 200,
      // Error replies tell the SDKs not to retry, so each test sends one request.
      headers: { "content-type": "application/json", "x-should-retry": "false" },
    });
  });

  return {
    sent,
    reply: (r: FakeReply) => replies.push(r),
    last: () => sent.at(-1)!,
  };
}

export const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
