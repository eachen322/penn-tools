// Platform Playground: working examples of the platform APIs, for tool teams.
// AskPenn (/tools/askpenn) is the other reference tool: streaming, chat
// history and a tool's own database. Signed-out visitors are asked to sign in,
// and users without a saved key are sent to Settings.

import type { Metadata } from "next";
import Link from "next/link";
import { PROVIDER_LABELS } from "@penntools/core/ai";
import { MAX_PROMPT_LENGTH, MAX_QUERY_LENGTH, MAX_SYLLABUS_LENGTH, SAMPLE_SYLLABUS } from "@penntools/tool-platform-playground";
import { getAI } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { SignInPrompt } from "@/components/layout/SignInPrompt";
import cardPage from "@/components/layout/CardPage.module.css";
import { Playground } from "./Playground";

export const metadata: Metadata = {
  title: "Platform Playground",
};

export default async function PlatformPlaygroundPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <SignInPrompt title="Platform Playground" message="Sign in to try the platform APIs with your own API keys." />;
  }

  const providers = await (await getAI())!.providers();
  if (providers.length === 0) {
    return (
      <div className={cardPage.page}>
        <h1 className={cardPage.title}>Platform Playground</h1>
        <section className={cardPage.card}>
          <p className={cardPage.muted}>
            The Playground runs on your own AI API key. Add an OpenAI or Anthropic key in{" "}
            <Link href="/settings" style={{ color: "var(--penn-blue)", textDecoration: "underline" }}>
              Settings
            </Link>{" "}
            to try it.
          </p>
        </section>
      </div>
    );
  }

  return (
    <Playground
      providers={providers}
      labels={PROVIDER_LABELS}
      sampleSyllabus={SAMPLE_SYLLABUS}
      limits={{ prompt: MAX_PROMPT_LENGTH, syllabus: MAX_SYLLABUS_LENGTH, query: MAX_QUERY_LENGTH }}
    />
  );
}
