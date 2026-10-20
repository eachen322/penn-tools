// ─────────────────────────────────────────────────────────────────────────────
// AskPenn conversations
//
// sendMessage() is the whole turn: it saves the user's message (starting a
// chat if needed), streams the reply through the AI API with the user's key,
// and saves the reply once it's complete. The tool's stream route turns its
// events into server-sent events for the page.
// ─────────────────────────────────────────────────────────────────────────────

import type { AI, AIProvider, AIReasoning, AIStreamEvent, AITier } from "@penntools/core/ai";
import type { Sql } from "postgres";
import { addMessage, createChat, getMessages, type ChatMessage } from "./chats.js";

export const SYSTEM_PROMPT = [
  "You are AskPenn, a concise and helpful assistant for University of Pennsylvania students and staff.",
  "Keep answers short: use 1-3 sentences for simple questions. When the answer is a list of items (documents, steps, things to bring), respond with a bullet list using '•' for each item instead of summarizing it in a sentence.",
  "If your answer includes a link, put it at the very end on its own line as a plain URL (e.g. https://example.com).",
].join("\n\n");

/**
 * Used unless the user picks otherwise: the cheapest tier at low reasoning,
 * which suits short answers. Users can choose any tier and reasoning level.
 */
export const DEFAULT_TIER: AITier = "fast";
export const DEFAULT_REASONING: AIReasoning = "low";

export const MAX_MESSAGE_LENGTH = 4000;

/** How many of a chat's latest messages the model sees, bounding cost and context. */
export const HISTORY_LIMIT = 40;

const PROVIDERS: readonly AIProvider[] = ["openai", "anthropic"];
const TIERS: readonly AITier[] = ["fast", "standard", "best"];
const REASONING_LEVELS: readonly AIReasoning[] = ["low", "medium", "high"];

/** Why a request to send a message is invalid, or null if it's fine. tier and reasoning are optional. */
export function checkRequest(request: {
  chatId?: unknown;
  provider?: unknown;
  tier?: unknown;
  reasoning?: unknown;
  content?: unknown;
}): string | null {
  const { chatId, provider, tier, reasoning, content } = request;
  if (chatId !== undefined && chatId !== null && typeof chatId !== "string") return "chatId must be a string.";
  if (!PROVIDERS.includes(provider as AIProvider)) return "provider must be openai or anthropic.";
  if (tier !== undefined && !TIERS.includes(tier as AITier)) return "tier must be fast, standard or best.";
  if (reasoning !== undefined && !REASONING_LEVELS.includes(reasoning as AIReasoning)) {
    return "reasoning must be low, medium or high.";
  }
  if (typeof content !== "string" || !content.trim()) return "Enter a message.";
  if (content.length > MAX_MESSAGE_LENGTH) return `Keep messages under ${MAX_MESSAGE_LENGTH} characters.`;
  return null;
}

/** A new chat's title: its first message on one line, cut to 60 characters. */
export function chatTitle(firstMessage: string): string {
  const line = firstMessage.trim().replace(/\s+/g, " ");
  return line.length > 60 ? `${line.slice(0, 60)}…` : line;
}

/**
 * What the model sees: the chat's latest messages, without empty ones, and
 * starting with a user message as the AI API requires.
 */
export function historyForModel(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.filter((m) => m.content.trim()).slice(-HISTORY_LIMIT);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

/** The chat doesn't exist or belongs to someone else. */
export class ChatNotFoundError extends Error {
  constructor() {
    super("Chat not found.");
    this.name = "ChatNotFoundError";
  }
}

export type ConversationEvent = { type: "chat"; chatId: string } | AIStreamEvent;

export interface SendMessageInput {
  sql: Sql;
  ai: AI;
  userId: string;
  /** Null starts a new chat. */
  chatId: string | null;
  provider: AIProvider;
  /** Defaults to DEFAULT_TIER. */
  tier?: AITier;
  /** Defaults to DEFAULT_REASONING. */
  reasoning?: AIReasoning;
  content: string;
  signal?: AbortSignal;
}

/**
 * Yields the chat's id first, then the reply's text as it streams and a final
 * "done" event. Throws ChatNotFoundError before saving anything if chatId isn't
 * the user's, and the AI API's AIError if the reply fails; the user's message
 * is kept either way, and the reply is saved only when it completes.
 */
export async function* sendMessage(input: SendMessageInput): AsyncGenerator<ConversationEvent> {
  const { sql, ai, userId, provider, content, signal } = input;

  let chatId = input.chatId;
  let history: ChatMessage[] = [];
  if (chatId) {
    const existing = await getMessages(sql, userId, chatId);
    if (!existing) throw new ChatNotFoundError();
    history = existing;
  } else {
    chatId = await createChat(sql, userId, chatTitle(content));
  }

  const message: ChatMessage = { role: "user", content };
  await addMessage(sql, chatId, message);
  yield { type: "chat", chatId };

  const reply = ai.stream({
    provider,
    tier: input.tier ?? DEFAULT_TIER,
    reasoning: input.reasoning ?? DEFAULT_REASONING,
    system: SYSTEM_PROMPT,
    messages: historyForModel([...history, message]),
    ...(signal && { signal }),
  });
  for await (const event of reply) {
    if (event.type === "done" && event.result.text.trim()) {
      await addMessage(sql, chatId, { role: "assistant", content: event.result.text });
    }
    yield event;
  }
}
