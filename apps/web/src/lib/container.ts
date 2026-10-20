// ─────────────────────────────────────────────────────────────────────────────
// Service container — SERVER ONLY
//
// This is the single place that reads env vars and wires concrete platform
// implementations together.  It must NEVER be imported by client components.
//
// Every API route imports from here instead of constructing services inline.
// This makes it trivial to swap implementations (e.g. switch LLM provider)
// and keeps env access out of every other file.
//
// Pattern: manual DI via a lazy singleton.  We avoid heavy DI frameworks to
// keep the surface area small.  If complexity grows, consider tsyringe or
// awilix.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only"; // Next.js guard — this module cannot be bundled client-side

import {
  prisma,
  PrismaChatRepository,
  PrismaMessageRepository,
  PrismaToolDataRepository,
  PrismaUserRepository,
  PrismaUserApiKeyRepository,
  PrismaResourceRepository,
} from "@penntools/platform/db";
import type { UserApiKeyRepository } from "@penntools/core/repositories";
import { createAI, createUserEmbeddings } from "@penntools/platform/ai";
import { EMBEDDING_MODEL } from "@penntools/core/ai";
import type { AI } from "@penntools/core/ai";
import { OpenAIAdapter, AnthropicAdapter } from "@penntools/platform/llm";
import { OpenAIEmbeddingAdapter } from "@penntools/platform/embeddings";
import type { EmbeddingProvider } from "@penntools/core/embeddings";
import type { ResourceRepository } from "@penntools/core/resources";
import { PostHogAnalytics } from "@penntools/platform/analytics";
import { NoopAnalytics } from "@penntools/core/analytics";
import { toolRegistry, ToolRunner } from "@penntools/core/tools";
import type { ToolContext } from "@penntools/core/tools";
import type { LLMProvider } from "@penntools/core/llm";
import type { Analytics } from "@penntools/core/analytics";
import type { UserId, User } from "@penntools/core/types";

// ── Tool bootstrap ────────────────────────────────────────────────────────────
import { PlatformPlaygroundTool } from "@penntools/tool-platform-playground";
toolRegistry.register(new PlatformPlaygroundTool());
// import { Tool3 } from "@penntools/tool-3";
// toolRegistry.register(new Tool3());
import { Tool7 } from "@penntools/tool-7";
toolRegistry.register(new Tool7());
import { Tool8 } from "@penntools/tool-8";
toolRegistry.register(new Tool8());
import { PennPlannerTool } from "@penntools/tool-penn-planner";
toolRegistry.register(new PennPlannerTool());
import { Tool1 } from "@penntools/tool-1";
toolRegistry.register(new Tool1());
// import { Tool18 } from "@penntools/tool-18";
// toolRegistry.register(new Tool18());
import { AiCompassTool } from "@penntools/tool-ai-compass";
toolRegistry.register(new AiCompassTool());
import { PitchCoachTool } from "@penntools/tool-pitch-coach";
toolRegistry.register(new PitchCoachTool());
// ── Resource seeding (fire-and-forget) ────────────────────────────────────────
// Imported lazily to avoid a circular reference with the logger defined below.
import { seedResources } from "./seedResources";

// ── Repositories ──────────────────────────────────────────────────────────────
// Postgres is required, locally too (see README for the Docker setup).

if (!process.env["DATABASE_URL"]) {
  console.error("[PennTools] DATABASE_URL not set — every database call will fail. See README for local setup.");
}

export const repositories = {
  chats: new PrismaChatRepository(prisma),
  messages: new PrismaMessageRepository(prisma),
  toolData: new PrismaToolDataRepository(prisma),
  users: new PrismaUserRepository(prisma),
};

// Kept out of `repositories`, which tools receive as `context.db`, so tools never
// receive users' keys. Tool code must not import it either (see CLAUDE.md);
// the AI API below reads keys on the tool's behalf.
export const userApiKeys: UserApiKeyRepository = new PrismaUserApiKeyRepository(prisma);

// ── Embedding provider ─────────────────────────────────────────────────────
// Only OpenAI provides an embeddings API we currently support.
// If OPENAI_API_KEY is absent, embeddingProvider is null and RAG falls back
// to returning a capped list of all stored resources.

export const embeddingProvider: EmbeddingProvider | null =
  process.env["OPENAI_API_KEY"]
    ? new OpenAIEmbeddingAdapter(process.env["OPENAI_API_KEY"])
    : null;

if (!embeddingProvider) {
  console.warn(
    "[PennTools] OPENAI_API_KEY not set — semantic resource search disabled. Resources will not be embedded."
  );
}

// ── Resource repository ────────────────────────────────────────────────────

export const resourceRepository: ResourceRepository = new PrismaResourceRepository(prisma);

// ── AI API (new tools) ────────────────────────────────────────────────────────
// Generation uses only the user's saved keys, never the platform's. Search-query
// embeddings use the user's OpenAI key, or OPENAI_API_KEY when they have none
// (logged as "embeddings.platform_key"). Tool routes reach these through
// getAI / getEmbeddings in lib/ai.ts; tool execute() gets them on ToolContext.

export function createUserAI(userId: UserId): AI {
  return createAI({
    getKey: (provider) => userApiKeys.get(userId, provider),
    listProviders: async () => (await userApiKeys.list(userId)).map((key) => key.provider),
    logger,
  });
}

export async function createUserEmbeddingProvider(
  userId: UserId,
  toolId: string,
): Promise<EmbeddingProvider | null> {
  return createUserEmbeddings({
    userKey: await userApiKeys.get(userId, "openai"),
    platformKey: process.env["OPENAI_API_KEY"] || null,
    model: EMBEDDING_MODEL,
    logger,
    logFields: { userId, toolId },
  });
}

// ── LLM provider (legacy) ─────────────────────────────────────────────────────
// For existing tools only (context.llm, /api/llm/complete); new tools use the
// AI API above. Reads OPENAI_API_KEY or ANTHROPIC_API_KEY from env.  Falls back
// to OpenAI.

function createLLMProvider(): LLMProvider {
  if (process.env["ANTHROPIC_API_KEY"]) {
    return new AnthropicAdapter(process.env["ANTHROPIC_API_KEY"]);
  }
  if (process.env["OPENAI_API_KEY"]) {
    return new OpenAIAdapter(process.env["OPENAI_API_KEY"]);
  }
  // No key configured — use stub (OpenAI adapter still returns a canned response).
  console.warn(
    "[PennTools] No LLM API key configured. Responses will be stubbed."
  );
  return new OpenAIAdapter("stub-key");
}

export const llm: LLMProvider = createLLMProvider();

/**
 * Create a per-request LLM provider from a user-supplied API key.
 * Detects provider by key prefix: "sk-ant-" → Anthropic, otherwise → OpenAI.
 */
export function createLLMFromKey(apiKey: string): LLMProvider {
  if (apiKey.startsWith("sk-ant-")) {
    return new AnthropicAdapter(apiKey);
  }
  return new OpenAIAdapter(apiKey);
}

// ── Analytics ─────────────────────────────────────────────────────────────────

function createAnalytics(): Analytics {
  const key = process.env["POSTHOG_API_KEY"];
  const host = process.env["POSTHOG_HOST"] ?? "https://app.posthog.com";
  if (key) {
    return new PostHogAnalytics(key, host);
  }
  return new NoopAnalytics();
}

export const analytics: Analytics = createAnalytics();

// ── Logger ────────────────────────────────────────────────────────────────────

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg: string, error?: unknown) =>
    console.error(JSON.stringify({ level: "error", msg, error: String(error) })),
};

// ── Seed resources on startup (fire-and-forget) ────────────────────────────────
// TODO: Uncomment once pgvector is provisioned and OPENAI_API_KEY is set.
// if (embeddingProvider) {
//   seedResources(embeddingProvider, resourceRepository, logger).catch((err) =>
//     logger.error("[container] seedResources unexpectedly threw", err)
//   );
// }

// ── ToolRunner ────────────────────────────────────────────────────────────────

export const toolRunner = new ToolRunner({
  registry: toolRegistry,
  contextFactory: async (toolId: string, userId: UserId): Promise<ToolContext> => {
    const user = await repositories.users.findById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    return {
      userId,
      currentUser: user,
      db: repositories,
      llm,
      ai: createUserAI(userId),
      embeddings: await createUserEmbeddingProvider(userId, toolId),
      analytics,
      logger,
      config: { toolId },
    };
  },
  logger,
});
