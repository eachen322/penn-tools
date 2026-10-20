// AskPenn: chat with an AI assistant for Penn, on the user's own API key.
// Signed-out visitors are asked to sign in, and users without a saved key are
// sent to Settings; otherwise the chat loads with the user's chats.

import type { Metadata } from "next";
import Link from "next/link";
import { PROVIDER_LABELS } from "@penntools/core/ai";
import { toolSql } from "@penntools/platform/db";
import { DEFAULT_REASONING, DEFAULT_TIER, MAX_MESSAGE_LENGTH, listChats } from "@penntools/tool-askpenn";
import { getAI } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { SignInPrompt } from "@/components/layout/SignInPrompt";
import cardPage from "@/components/layout/CardPage.module.css";
import { AskPenn } from "./AskPenn";

export const metadata: Metadata = {
  title: "AskPenn",
};

export default async function AskPennPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <SignInPrompt title="AskPenn" message="Sign in to chat with AskPenn and keep your chat history." />;
  }

  const providers = await (await getAI())!.providers();
  if (providers.length === 0) {
    return (
      <div className={cardPage.page}>
        <h1 className={cardPage.title}>AskPenn</h1>
        <section className={cardPage.card}>
          <p className={cardPage.muted}>
            AskPenn runs on your own AI API key. Add an OpenAI or Anthropic key in{" "}
            <Link href="/settings" style={{ color: "var(--penn-blue)", textDecoration: "underline" }}>
              Settings
            </Link>{" "}
            to start chatting.
          </p>
        </section>
      </div>
    );
  }

  const sql = toolSql("askpenn");
  if (!sql) throw new Error("AskPenn's database is not configured (check DATABASE_URL).");

  return (
    <AskPenn
      initialChats={await listChats(sql, user.id)}
      providers={providers}
      labels={PROVIDER_LABELS}
      defaultTier={DEFAULT_TIER}
      defaultReasoning={DEFAULT_REASONING}
      maxMessageLength={MAX_MESSAGE_LENGTH}
    />
  );
}
