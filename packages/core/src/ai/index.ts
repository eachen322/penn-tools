// The AI API for new tools. Existing tools use the legacy LLM API
// (@penntools/core/llm) until they migrate.

export { z } from "zod";
export { AIError, isAIError } from "./AIError.js";
export type { AIErrorKind, AIErrorInfo } from "./AIError.js";
export {
  MODELS,
  DEFAULT_TIER,
  DEFAULT_MAX_OUTPUT_TOKENS,
  MAX_OUTPUT_TOKENS_LIMIT,
  EMBEDDING_MODEL,
  PROVIDER_LABELS,
} from "./models.js";
export type { ModelSpec, ModelId } from "./models.js";
export type {
  AI,
  AIProvider,
  AITier,
  AIReasoning,
  AIMessage,
  AISchema,
  AIStopReason,
  AIUsage,
  AIStreamEvent,
  GenerateRequest,
  GenerateResult,
  GenerateObjectRequest,
  GenerateObjectResult,
} from "./types.js";
