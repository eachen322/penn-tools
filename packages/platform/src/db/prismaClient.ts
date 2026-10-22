// ─────────────────────────────────────────────────────────────────────────────
// Prisma client singleton
//
// In Next.js (which hot-reloads in dev), a new module instance is created on
// each reload.  Without the global cache below, each reload would open a new
// database connection pool and exhaust Postgres connections quickly.
//
// This pattern is the official Next.js recommendation for Prisma:
//   https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";

// Augment the Node global to hold the cached instance.
declare global {
  // `var`, not `let`: only var declarations add a property to globalThis.
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__prisma = prisma;
}
