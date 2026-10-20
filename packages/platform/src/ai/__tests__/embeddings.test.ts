import { describe, it, expect, beforeEach, vi } from "vitest";
import { EMBEDDING_MODEL } from "@penntools/core/ai";
import { createUserEmbeddings } from "../embeddings.js";
import { installFakeFetch } from "./fakeFetch.js";
import { openaiErrorReply } from "./replies.js";

const embeddingsReply = {
  json: {
    object: "list",
    model: EMBEDDING_MODEL,
    // Out of order on purpose: results must follow the inputs' order.
    data: [
      { object: "embedding", index: 1, embedding: [0, 1] },
      { object: "embedding", index: 0, embedding: [1, 0] },
    ],
    usage: { prompt_tokens: 6, total_tokens: 6 },
  },
};

let net: ReturnType<typeof installFakeFetch>;
let logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
beforeEach(() => {
  net = installFakeFetch();
  logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
});

function embeddings(userKey: string | null, platformKey: string | null) {
  return createUserEmbeddings({ userKey, platformKey, model: EMBEDDING_MODEL, logger, logFields: { userId: "u1", toolId: "demo" } });
}

describe("createUserEmbeddings", () => {
  it("uses the user's key when they have one, without logging", async () => {
    net.reply(embeddingsReply);
    const vectors = await embeddings("sk-user", "sk-platform")!.embedMany(["a", "b"]);

    expect(vectors).toEqual([[1, 0], [0, 1]]);
    expect(net.last().headers.get("authorization")).toBe("Bearer sk-user");
    expect(net.last().body).toMatchObject({ model: EMBEDDING_MODEL, input: ["a", "b"] });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("uses the platform's key when the user has none, and logs it", async () => {
    net.reply(embeddingsReply);
    await embeddings(null, "sk-platform")!.embedMany(["a", "b"]);

    expect(net.last().headers.get("authorization")).toBe("Bearer sk-platform");
    expect(logger.info).toHaveBeenCalledWith("embeddings.platform_key", {
      userId: "u1",
      toolId: "demo",
      model: EMBEDDING_MODEL,
      inputs: 2,
      tokens: 6,
    });
  });

  it("is null when there is no key at all", () => {
    expect(embeddings(null, null)).toBeNull();
  });

  it("embed() returns the single vector", async () => {
    net.reply({ json: { ...embeddingsReply.json, data: [{ object: "embedding", index: 0, embedding: [0.5] }] } });
    expect(await embeddings("sk-user", null)!.embed("a")).toEqual([0.5]);
  });

  it("surfaces a rejected key as an AIError instead of falling back", async () => {
    net.reply(openaiErrorReply(401, "invalid_api_key", "Incorrect API key provided: sk-u****"));
    await expect(embeddings("sk-user", "sk-platform")!.embed("a")).rejects.toMatchObject({ kind: "invalid_key", provider: "openai" });
    expect(net.sent).toHaveLength(1);
  });
});
