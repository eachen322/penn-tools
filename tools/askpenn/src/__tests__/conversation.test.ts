import { describe, it, expect } from "vitest";
import { chatTitle, checkRequest, historyForModel, HISTORY_LIMIT, MAX_MESSAGE_LENGTH } from "../conversation.js";
import type { ChatMessage } from "../chats.js";

const user = (content: string): ChatMessage => ({ role: "user", content });
const assistant = (content: string): ChatMessage => ({ role: "assistant", content });

describe("chatTitle", () => {
  it("puts the first message on one line", () => {
    expect(chatTitle("  Where is\n\nthe   registrar? ")).toBe("Where is the registrar?");
  });

  it("cuts long messages to 60 characters", () => {
    const title = chatTitle("x".repeat(100));
    expect(title).toBe(`${"x".repeat(60)}…`);
  });
});

describe("historyForModel", () => {
  it("keeps only the latest messages", () => {
    const messages = Array.from({ length: HISTORY_LIMIT + 10 }, (_, i) => (i % 2 ? assistant(`a${i}`) : user(`u${i}`)));
    const history = historyForModel(messages);
    expect(history.length).toBeLessThanOrEqual(HISTORY_LIMIT);
    expect(history.at(-1)).toEqual(messages.at(-1));
  });

  it("starts with a user message, as the AI API requires", () => {
    // 41 messages: the latest 40 would start with an assistant message.
    const messages = [user("u0"), ...Array.from({ length: 20 }, (_, i) => [assistant(`a${i}`), user(`u${i + 1}`)]).flat()];
    expect(historyForModel(messages)[0]?.role).toBe("user");
  });

  it("leaves out empty messages", () => {
    expect(historyForModel([user("hi"), assistant("  "), user("again")])).toEqual([user("hi"), user("again")]);
  });

  it("is empty when there is no user message", () => {
    expect(historyForModel([assistant("hello")])).toEqual([]);
  });
});

describe("checkRequest", () => {
  const valid = { chatId: null, provider: "openai", content: "hi" };

  it("accepts a valid request, with or without a chat, speed and thinking effort", () => {
    expect(checkRequest(valid)).toBeNull();
    expect(checkRequest({ ...valid, chatId: "some-id" })).toBeNull();
    expect(checkRequest({ ...valid, tier: "best", reasoning: "high" })).toBeNull();
  });

  it.each([
    ["an unknown provider", { ...valid, provider: "gemini" }],
    ["an empty message", { ...valid, content: "   " }],
    ["a non-string message", { ...valid, content: 5 }],
    ["a message over the limit", { ...valid, content: "x".repeat(MAX_MESSAGE_LENGTH + 1) }],
    ["a non-string chat id", { ...valid, chatId: 5 }],
    ["an unknown speed", { ...valid, tier: "turbo" }],
    ["an unknown thinking effort", { ...valid, reasoning: "max" }],
  ])("rejects %s", (_label, request) => {
    expect(checkRequest(request)).toEqual(expect.any(String));
  });
});
