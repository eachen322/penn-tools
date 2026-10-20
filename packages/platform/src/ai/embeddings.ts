// ─────────────────────────────────────────────────────────────────────────────
// Query embeddings for a user
//
// Embeds with the user's OpenAI key when they've saved one, otherwise with the
// platform's. Each call on the platform's key writes one log line
// ("embeddings.platform_key") so it's visible how often, and for whom, the
// platform pays; the cost itself shows on that key in OpenAI's usage dashboard.
// Seeds use OpenAIEmbeddingAdapter with the platform's key directly.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import type { EmbeddingProvider } from "@penntools/core/embeddings";
import type { Logger } from "@penntools/core/tools";
import { toAIError } from "./errors.js";

export interface CreateUserEmbeddingsOptions {
  userKey: string | null;
  platformKey: string | null;
  model: string;
  logger: Logger;
  /** Added to the log line written when the platform's key is used, e.g. { userId, toolId }. */
  logFields: Record<string, unknown>;
}

/** Null when there is neither a user key nor a platform key. */
export function createUserEmbeddings(options: CreateUserEmbeddingsOptions): EmbeddingProvider | null {
  const { userKey, platformKey, model, logger, logFields } = options;
  const apiKey = userKey ?? platformKey;
  if (!apiKey) return null;
  const client = new OpenAI({ apiKey, timeout: 15_000 });

  async function embedMany(texts: string[]): Promise<number[][]> {
    try {
      const response = await client.embeddings.create({ model, input: texts });
      if (!userKey) {
        logger.info("embeddings.platform_key", {
          ...logFields,
          model,
          inputs: texts.length,
          tokens: response.usage.prompt_tokens,
        });
      }
      return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    } catch (error) {
      throw toAIError("openai", error, logger);
    }
  }

  return {
    providerName: "openai",
    model,
    embedMany,
    embed: async (text) => (await embedMany([text]))[0]!,
  };
}
