// Where sign-in sends a Google account that isn't a Penn one (PENN_ONLY_PAGE in
// lib/pennEmail.ts, used by the signIn callback in lib/auth.ts). Signing in
// again from here comes back here, so a signed-in visitor goes on to the home
// page.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignInPrompt } from "@/components/layout/SignInPrompt";

export default async function PennOnlyPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <SignInPrompt
      title="Penn accounts only"
      message="PennTools only accepts Google accounts with a upenn.edu email address, including school addresses such as wharton.upenn.edu. Sign in again and choose your Penn account."
    />
  );
}
