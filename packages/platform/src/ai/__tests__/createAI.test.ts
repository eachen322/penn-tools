import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIError, DEFAULT_MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS_LIMIT, MODELS } from "@penntools/core/ai";
import type { AIProvider, GenerateRequest } from "@penntools/core/ai";
import { createAI } from "../createAI.js";
import { installFakeFetch, silentLogger } from "./fakeFetch.js";
import { anthropicReply, openaiReply } from "./replies.js";

const KEYS: Record<AIProvider, string> = { openai: "sk-proj-user-openai", anthropic: "sk-ant-user-anthropic" };
const hi = [{ role: "user" as const, content: "hi" }];

let net: ReturnType<typeof installFakeFetch>;
beforeEach(() => {
  net = installFakeFetch();
});

function aiWithKeys(keys: Partial<Record<AIProvider, string>> = KEYS) {
  const getKey = vi.fn(async (provider: AIProvider) => keys[provider] ?? null);
  const ai = createAI({ getKey, listProviders: async () => Object.keys(keys) as AIProvider[], logger: silentLogger });
  return { ai, getKey };
}

describe("requests", () => {
  it("uses the standard tier and the defaults when the request names neither tier nor model", async () => {
    const { ai } = aiWithKeys();
    net.reply(openaiReply());
    await ai.generate({ provider: "openai", system: "Be brief.", messages: hi });

    expect(net.last().headers.get("authorization")).toBe(`Bearer ${KEYS.openai}`);
    expect(net.last().body).toMatchObject({
      model: MODELS.openai.standard.id,
      reasoning: { effort: MODELS.openai.standard.reasoning },
      max_output_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
      instructions: "Be brief.",
      input: hi,
      store: false,
    });
  });

  it("applies the tier and the request's overrides, with the user's key for that provider", async () => {
    const { ai, getKey } = aiWithKeys();
    net.reply(anthropicReply());
    await ai.generate({ provider: "anthropic", tier: "fast", reasoning: "high", maxOutputTokens: 300, messages: hi });

    expect(getKey).toHaveBeenCalledWith("anthropic");
    expect(net.last().headers.get("x-api-key")).toBe(KEYS.anthropic);
    expect(net.last().url.pathname).toBe("/v1/messages");
    expect(net.last().body).toEqual({
      model: MODELS.anthropic.fast.id,
      max_tokens: 300,
      messages: hi,
      output_config: { effort: "high" },
      stream: true,
    });
  });

  it("uses an explicit model's own tier defaults, ignoring `tier`", async () => {
    const { ai } = aiWithKeys();
    net.reply(anthropicReply());
    await ai.generate({ provider: "anthropic", model: MODELS.anthropic.best.id, tier: "fast", messages: hi });

    expect(net.last().body).toMatchObject({
      model: MODELS.anthropic.best.id,
      output_config: { effort: MODELS.anthropic.best.reasoning },
    });
  });
});

describe("keys", () => {
  it("fails with missing_key, without calling the provider, when the user has no key for it", async () => {
    const { ai } = aiWithKeys({ openai: KEYS.openai });
    await expect(ai.generate({ provider: "anthropic", messages: hi })).rejects.toMatchObject({
      kind: "missing_key",
      provider: "anthropic",
    });
    expect(net.sent).toHaveLength(0);
  });

  it("lists the providers the user has keys for", async () => {
    const { ai } = aiWithKeys({ openai: KEYS.openai });
    expect(await ai.providers()).toEqual(["openai"]);
  });
});

describe("request checks", () => {
  // Requests can come from browser input through a tool's server action, so
  // these are cast past the types on purpose.
  const invalid: [string, unknown][] = [
    ["an unknown provider", { provider: "gemini", messages: hi }],
    ["another provider's model", { provider: "openai", model: MODELS.anthropic.best.id, messages: hi }],
    ["an unknown tier", { provider: "openai", tier: "huge", messages: hi }],
    ["an unknown reasoning level", { provider: "openai", reasoning: "max", messages: hi }],
    ["no messages", { provider: "openai", messages: [] }],
    ["an assistant message first", { provider: "openai", messages: [{ role: "assistant", content: "hi" }] }],
    ["a system message in messages", { provider: "openai", messages: [{ role: "system", content: "hi" }] }],
    ["non-string content", { provider: "openai", messages: [{ role: "user", content: 5 }] }],
    ["empty content", { provider: "anthropic", messages: [{ role: "user", content: "" }] }],
    ["a non-string system prompt", { provider: "openai", system: 5, messages: hi }],
    ["zero maxOutputTokens", { provider: "openai", maxOutputTokens: 0, messages: hi }],
    ["fractional maxOutputTokens", { provider: "openai", maxOutputTokens: 1.5, messages: hi }],
    ["maxOutputTokens over the limit", { provider: "openai", maxOutputTokens: MAX_OUTPUT_TOKENS_LIMIT + 1, messages: hi }],
  ];

  it.each(invalid)("rejects %s as bad_request without calling a provider", async (_label, request) => {
    const { ai } = aiWithKeys();
    const error = await ai.generate(request as GenerateRequest).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error).toMatchObject({ kind: "bad_request" });
    expect(net.sent).toHaveLength(0);
  });
});
