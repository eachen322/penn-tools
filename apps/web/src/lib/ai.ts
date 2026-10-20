// ─────────────────────────────────────────────────────────────────────────────
// AI API for tools' own routes and server actions — SERVER ONLY
//
// Both functions are bound to the signed-in user: the platform reads that
// user's saved keys server-side, and tool code never sees them.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import type { AI } from "@penntools/core/ai";
import type { EmbeddingProvider } from "@penntools/core/embeddings";
import { toolRegistry } from "@penntools/core/tools";
import { getCurrentUser } from "./auth";
import { createUserAI, createUserEmbeddingProvider } from "./container";

/** The AI API for the signed-in user, or null when signed out (respond with signInRequired()). */
export async function getAI(): Promise<AI | null> {
  const user = await getCurrentUser();
  return user ? createUserAI(user.id) : null;
}

/**
 * Embeddings for search queries, using the user's OpenAI key or else the
 * platform's. Null when signed out or when no OpenAI key is available. Pass
 * your tool's manifest id: it labels the log line written when the platform's
 * key is used.
 */
export async function getEmbeddings(toolId: string): Promise<EmbeddingProvider | null> {
  if (!toolRegistry.get(toolId)) {
    throw new Error(`Unknown tool "${toolId}": pass your tool's manifest id.`);
  }
  const user = await getCurrentUser();
  return user ? createUserEmbeddingProvider(user.id, toolId) : null;
}
