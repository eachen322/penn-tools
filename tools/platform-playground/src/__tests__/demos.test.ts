// How to test tool logic that uses the AI and Embeddings APIs: pass in fakes
// that record what they were asked and return canned replies. No API keys,
// no network, no cost.

import { describe, it, expect } from "vitest";
import type { AI, GenerateObjectRequest, GenerateRequest, GenerateResult } from "@penntools/core/ai";
import type { EmbeddingProvider } from "@penntools/core/embeddings";
import { checkText, extractTasks, generateAnswer, searchResources, SyllabusTasks } from "../demos.js";

const result: GenerateResult = {
  text: "Hello",
  provider: "openai",
  model: "gpt-6-luna",
  usage: { inputTokens: 5, outputTokens: 2, reasoningTokens: 0 },
  stopReason: "end",
};

/** An AI that records requests; generateObject returns `object`. */
function fakeAI(object: unknown = {}) {
  const requests: (GenerateRequest | GenerateObjectRequest<typeof SyllabusTasks>)[] = [];
  const ai = {
    providers: async () => ["openai"],
    generate: async (request: GenerateRequest) => {
      requests.push(request);
      return result;
    },
    generateObject: async (request: GenerateObjectRequest<typeof SyllabusTasks>) => {
      requests.push(request);
      return { object, provider: "openai", model: "gpt-6-luna", usage: result.usage };
    },
    stream: () => {
      throw new Error("not used");
    },
  } as unknown as AI;
  return { ai, requests };
}

/** Embeddings where each text's vector counts a few keywords, so similarity is predictable. */
function fakeEmbeddings() {
  const words = ["interview", "finance", "stress", "startup"];
  const calls: string[][] = [];
  const embeddings: EmbeddingProvider = {
    providerName: "fake",
    model: "fake-model",
    embed: async (text) => (await embeddings.embedMany([text]))[0]!,
    embedMany: async (texts) => {
      calls.push(texts);
      return texts.map((text) => words.map((word) => (text.toLowerCase().includes(word) ? 1 : 0)));
    },
  };
  return { embeddings, calls };
}

describe("generateAnswer", () => {
  it("sends one prompt on the fast tier and returns the result", async () => {
    const { ai, requests } = fakeAI();
    expect(await generateAnswer(ai, "anthropic", "What is a DCF?")).toEqual(result);
    expect(requests[0]).toMatchObject({
      provider: "anthropic",
      tier: "fast",
      reasoning: "low",
      messages: [{ role: "user", content: "What is a DCF?" }],
    });
  });
});

describe("extractTasks", () => {
  const tasks = { tasks: [{ title: "Midterm", type: "exam", dueDate: "2026-10-20" }] };

  it("asks for the SyllabusTasks shape and returns the object", async () => {
    const { ai, requests } = fakeAI(tasks);
    expect(await extractTasks(ai, "openai", "Midterm Oct 20")).toEqual(tasks);
    expect((requests[0] as GenerateObjectRequest<typeof SyllabusTasks>).schema).toBe(SyllabusTasks);
  });

  it("SyllabusTasks requires every field, with null for a missing date", () => {
    expect(SyllabusTasks.safeParse({ tasks: [{ title: "Read ch. 3", type: "reading", dueDate: null }] }).success).toBe(true);
    expect(SyllabusTasks.safeParse({ tasks: [{ title: "Read ch. 3", type: "reading" }] }).success).toBe(false);
    expect(SyllabusTasks.safeParse({ tasks: [{ title: "Lunch", type: "social", dueDate: null }] }).success).toBe(false);
  });
});

describe("searchResources", () => {
  it("ranks resources by meaning, best first", async () => {
    const { embeddings } = fakeEmbeddings();
    const results = await searchResources(embeddings, "help preparing for an interview");
    expect(results[0]?.title).toBe("Career coaching office hours");
    expect(results.map((r) => r.score)).toEqual([...results.map((r) => r.score)].sort((a, b) => b - a));
  });

  it("returns at most five", async () => {
    const { embeddings } = fakeEmbeddings();
    expect(await searchResources(embeddings, "finance")).toHaveLength(5);
  });

  it("embeds the query and every resource in one call", async () => {
    const { embeddings, calls } = fakeEmbeddings();
    const resources = [
      { title: "A", description: "startup grants" },
      { title: "B", description: "stress support" },
    ];
    await searchResources(embeddings, "startup", resources);
    expect(calls).toEqual([["startup", "A: startup grants", "B: stress support"]]);
  });
});

describe("checkText", () => {
  it("accepts text within the limit", () => {
    expect(checkText("hi", "a prompt", 10)).toBeNull();
  });

  it.each([
    ["empty text", "  "],
    ["a non-string", 5],
    ["text over the limit", "x".repeat(11)],
  ])("rejects %s", (_label, value) => {
    expect(checkText(value, "a prompt", 10)).toEqual(expect.any(String));
  });
});
