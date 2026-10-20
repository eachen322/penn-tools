// ─────────────────────────────────────────────────────────────────────────────
// drop-retired-tables — runs first in `db:deploy`, before `prisma db push`
//
// `prisma db push` refuses to drop a table that still holds data, which would
// stop the deploy. When a model is removed from schema.prisma on purpose and
// its data isn't kept, list the drop here so the deploy goes through. Every
// statement must be safe to re-run. Remove an entry once every environment
// has deployed it.
//
// Tables are schema-qualified: tool schemas can have tables with the same
// names (askpenn has its own chats and messages).
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const RETIRED = [
  // AskPenn became a tool with its own schema; its old chat history isn't kept.
  'DROP TABLE IF EXISTS public.messages, public.chats CASCADE',
  'DROP TYPE IF EXISTS public."MessageRole"',
  // Penn resource search was disabled and has been removed.
  "DROP TABLE IF EXISTS public.resources",
];

// Locally, read DATABASE_URL from the web app's env file. Railway sets it directly.
const localEnvFile = fileURLToPath(new URL("../../../apps/web/.env.local", import.meta.url));
if (!process.env["DATABASE_URL"] && existsSync(localEnvFile)) process.loadEnvFile(localEnvFile);

const url = process.env["DATABASE_URL"];
if (!url) {
  console.error("DATABASE_URL is not set. Point it at the database as an admin user.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  for (const statement of RETIRED) await sql.unsafe(statement);
  console.log(`drop-retired-tables: ${RETIRED.length} statement(s) applied.`);
} finally {
  await sql.end();
}
