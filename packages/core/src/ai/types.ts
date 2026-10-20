// ─────────────────────────────────────────────────────────────────────────────
// AI API types
//
// The AI object tools receive is already bound to the signed-in user: it calls
// providers with that user's saved API key, which tools never see. The tool
// picks the provider on every call; if the user has no key for it, the call
// throws AIError("missing_key").
// ─────────────────────────────────────────────────────────────────────────────

import type { z } from "zod";
import type { ApiKeyProvider } from "../types/index.js";
import type { ModelId } from "./models.js";

export type AIProvider = ApiKeyProvider;
export type AITier = "fast" | "standard" | "best";
export type AIReasoning = "low" | "medium" | "high";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  provider: AIProvider;
  /** Which of the provider's models to use. Defaults to "standard". Ignored when `model` is set. */
  tier?: AITier;
  /** A specific model from the catalog (see MODELS); it must belong to `provider`. */
  model?: ModelId;
  /** How much the model reasons before answering. Defaults to the model's tier default. */
  reasoning?: AIReasoning;
  system?: string;
  /** The conversation so far; the system prompt goes in `system`, not here. */
  messages: AIMessage[];
  /** Cap on output, reasoning included. Defaults to DEFAULT_MAX_OUTPUT_TOKENS. */
  maxOutputTokens?: number;
  /** Abort the request, e.g. when the user navigates away. */
  signal?: AbortSignal;
}

/**
 * "end": finished normally. "max_tokens": cut off at maxOutputTokens, so the
 * text is incomplete. "refusal": the model or provider declined the request.
 */
export type AIStopReason = "end" | "max_tokens" | "refusal";

export interface AIUsage {
  inputTokens: number;
  /** Output tokens, reasoning included. */
  outputTokens: number;
  /** The part of outputTokens spent on reasoning. */
  reasoningTokens: number;
}

export interface GenerateResult {
  text: string;
  provider: AIProvider;
  /** The model that answered. */
  model: string;
  usage: AIUsage;
  stopReason: AIStopReason;
}

export type AIStreamEvent =
  | { type: "text"; delta: string }
  | { type: "done"; result: GenerateResult };

/**
 * The reply's shape, as a Zod object (import `z` from "@penntools/core/ai").
 * Mark optional fields `.nullable()`, not `.optional()`: providers' structured
 * output requires every field to be present.
 */
export type AISchema = z.ZodObject;

export interface GenerateObjectRequest<S extends AISchema> extends GenerateRequest {
  schema: S;
}

export interface GenerateObjectResult<T> {
  /** The reply, checked against the schema. */
  object: T;
  provider: AIProvider;
  model: string;
  usage: AIUsage;
}

export interface AI {
  /** Providers the user has saved a key for (never the keys). */
  providers(): Promise<AIProvider[]>;
  generate(request: GenerateRequest): Promise<GenerateResult>;
  /** Yields text as it arrives, then one "done" event with the full result. */
  stream(request: GenerateRequest): AsyncIterable<AIStreamEvent>;
  /** Returns an object matching `schema`, using the provider's structured output. */
  generateObject<S extends AISchema>(request: GenerateObjectRequest<S>): Promise<GenerateObjectResult<z.infer<S>>>;
}
