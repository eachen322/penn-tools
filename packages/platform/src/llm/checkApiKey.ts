// ─────────────────────────────────────────────────────────────────────────────
// API key check
//
// Before a user's key is saved, list the provider's models with it: a cheap,
// free call that fails only when the provider doesn't recognize the key.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ApiKeyProvider } from "@penntools/core/types";

/**
 * "valid" when the provider accepts the key, "invalid" when it rejects it.
 * Throws when the provider can't be reached or answers with another error.
 *
 * Only 401 counts as invalid: a 403 means the provider recognized the key but
 * it lacks permission to list models (e.g. a restricted OpenAI key), which
 * doesn't stop it from making completions.
 */
export async function checkApiKey(provider: ApiKeyProvider, key: string): Promise<"valid" | "invalid"> {
  // The SDKs wait up to 10 minutes by default; the user is waiting on this.
  const options = { apiKey: key, maxRetries: 0, timeout: 10_000 };
  try {
    if (provider === "openai") {
      await new OpenAI(options).models.list();
    } else {
      await new Anthropic(options).models.list({ limit: 1 });
    }
    return "valid";
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError || error instanceof Anthropic.AuthenticationError) {
      return "invalid";
    }
    if (error instanceof OpenAI.PermissionDeniedError || error instanceof Anthropic.PermissionDeniedError) {
      return "valid";
    }
    throw error;
  }
}
