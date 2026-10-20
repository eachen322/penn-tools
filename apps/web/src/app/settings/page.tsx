// Account settings — reached from the profile icon in the site header.
// Signed-out visitors are asked to sign in.

import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userApiKeys } from "@/lib/container";
import { SignOutButton } from "@/components/layout/AuthButtons";
import { SignInPrompt } from "@/components/layout/SignInPrompt";
import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import cardPage from "@/components/layout/CardPage.module.css";
import { ApiKeys } from "./ApiKeys";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Account settings",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <SignInPrompt title="Account settings" message="Sign in to see and change your account settings." />;
  }

  const savedKeys = await userApiKeys.list(user.id);

  return (
    <div className={cardPage.page}>
      <h1 className={cardPage.title}>Account settings</h1>

      <section className={cardPage.card}>
        <h2 className={styles.heading}>Profile</h2>
        <div className={styles.profile}>
          <ProfileAvatar name={user.name ?? user.email} image={user.image} size={56} />
          <div>
            <p className={styles.name}>{user.name ?? "—"}</p>
            <p className={cardPage.muted}>{user.email ?? "—"}</p>
          </div>
        </div>
        <p className={cardPage.muted}>Your name, email and picture come from your Google account.</p>
      </section>

      <section className={cardPage.card}>
        <h2 className={styles.heading}>API keys</h2>
        <p className={cardPage.muted}>
          Save your own OpenAI and Anthropic API keys. AskPenn and newer tools run on your keys; older tools will
          switch to them in a later update.
        </p>
        <ApiKeys saved={savedKeys} />
        <p className={cardPage.muted}>After you save a key, only its last four characters are shown.</p>
      </section>

      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
