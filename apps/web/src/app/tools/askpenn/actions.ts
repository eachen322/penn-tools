"use server";

// Loading chats for the AskPenn page. Sending a message goes through
// stream/route.ts instead, since server actions can't stream.

import { toolSql } from "@penntools/platform/db";
import { getMessages, listChats, type ChatMessage, type ChatSummary } from "@penntools/tool-askpenn";
import { getCurrentUser } from "@/lib/auth";

function db() {
  const sql = toolSql("askpenn");
  if (!sql) throw new Error("AskPenn's database is not configured (check DATABASE_URL).");
  return sql;
}

/** The chat's messages, or null if it isn't the signed-in user's. */
export async function loadChat(chatId: string): Promise<ChatMessage[] | null> {
  const user = await getCurrentUser();
  if (!user || typeof chatId !== "string") return null;
  return getMessages(db(), user.id, chatId);
}

/** The signed-in user's chats, most recently active first. */
export async function loadChats(): Promise<ChatSummary[]> {
  const user = await getCurrentUser();
  return user ? listChats(db(), user.id) : [];
}
