// AskPenn's chat storage, in its own askpenn schema. Callers pass the
// database client (toolSql("askpenn")) and the signed-in user's id; every read
// is scoped to that user.

import type { Sql } from "postgres";

export interface ChatSummary {
  id: string;
  title: string;
  /** ISO timestamp of the chat's latest message. */
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The user's chats, most recently active first. */
export async function listChats(sql: Sql, userId: string): Promise<ChatSummary[]> {
  const rows = await sql<{ id: string; title: string; updated_at: Date }[]>`
    SELECT id, title, updated_at FROM chats
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 100
  `;
  return rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at.toISOString() }));
}

/** The chat's messages in order, or null if it doesn't exist or isn't the user's. */
export async function getMessages(sql: Sql, userId: string, chatId: string): Promise<ChatMessage[] | null> {
  if (!UUID_RE.test(chatId)) return null;
  const [chat] = await sql`SELECT 1 FROM chats WHERE id = ${chatId} AND user_id = ${userId}`;
  if (!chat) return null;
  const rows = await sql<ChatMessage[]>`
    SELECT role, content FROM messages WHERE chat_id = ${chatId} ORDER BY id
  `;
  return rows.map(({ role, content }) => ({ role, content }));
}

/** Starts a chat and returns its id. */
export async function createChat(sql: Sql, userId: string, title: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO chats (user_id, title) VALUES (${userId}, ${title}) RETURNING id
  `;
  return row!.id;
}

/** Appends a message and marks the chat as just active. */
export async function addMessage(sql: Sql, chatId: string, message: ChatMessage): Promise<void> {
  await sql`INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, ${message.role}, ${message.content})`;
  await sql`UPDATE chats SET updated_at = NOW() WHERE id = ${chatId}`;
}
