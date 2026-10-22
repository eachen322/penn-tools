// Shown in place of a tool's content when it runs on the user's own AI API key
// (the AI API) and they haven't saved one: page.tsx returns it when
// `ai.providers()` is empty. The matching screen for signed-out visitors is
// SignInPrompt.

import Link from "next/link";
import styles from "./CardPage.module.css";

export function ApiKeyPrompt({ title }: { title: string }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <section className={styles.card}>
        <p className={styles.muted}>
          {title} runs on your own AI API key. Add an OpenAI or Anthropic key in{" "}
          <Link href="/settings" className={styles.link}>
            Settings
          </Link>{" "}
          to use it.
        </p>
      </section>
    </div>
  );
}
