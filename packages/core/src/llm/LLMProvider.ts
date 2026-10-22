// ─────────────────────────────────────────────────────────────────────────────
// LLMProvider interface (legacy)
//
// Deprecated: kept unchanged for existing tools until they migrate. New tools
// use the AI API (@penntools/core/ai). Delete this module once no tool uses it.
//
// The legacy API (/api/llm/complete) goes through this interface. Adapters
// (OpenAI, Anthropic) implement it in @penntools/platform; callers import only
// this interface, never a vendor SDK.
// ─────────────────────────────────────────────────────────────────────────────

// ── Message types ─────────────────────────────────────────────────────────────

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

// ── Completion request/response ───────────────────────────────────────────────

export interface CompletionRequest {
  messages: LLMMessage[];
  /** Max tokens to generate. Defaults to model maximum. */
  maxTokens?: number;
  /** Sampling temperature 0–1. */
  temperature?: number;
  /** Pass-through model override, e.g. "gpt-4o". If omitted, platform default is used. */
  model?: string;
  /** Optional system prompt. Added as the first message if not already present. */
  systemPrompt?: string;
}

export interface CompletionResponse {
  content: string;
  /** Model actually used (may differ from request.model if a fallback was applied). */
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ── Streaming ─────────────────────────────────────────────────────────────────

export interface StreamChunk {
  delta: string;
  done: boolean;
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface LLMProvider {
  /**
   * Non-streaming completion. Suitable for tools and API route handlers.
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /** Streaming completion via async generator. */
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk>;

  /** Human-readable provider name, e.g. "openai" | "anthropic". */
  readonly providerName: string;
}
