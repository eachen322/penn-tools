// Shown in place of a page's content to signed-out visitors. Tools that need a
// signed-in user for everything pass just their title, so every tool asks the
// same way; ApiKeyPrompt is the matching screen for a missing API key.

import { signInProvider } from "@/lib/auth";
import { SignInButton } from "./AuthButtons";
import styles from "./CardPage.module.css";

export function SignInPrompt({ title, message = `Sign in to use ${title}.` }: { title: string; message?: string }) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <section className={styles.card}>
        <p className={styles.muted}>{message}</p>
        <div>
          <SignInButton provider={signInProvider} />
        </div>
      </section>
    </div>
  );
}
