// Only Penn accounts can sign in (see the signIn callback in lib/auth.ts). Kept
// apart from auth.ts, which is server-only, so the unit tests can load it.

/** Whether `email` is at upenn.edu or a Penn school's subdomain, such as wharton.upenn.edu. */
export function isPennEmail(email: string | null | undefined): boolean {
  const at = email?.lastIndexOf("@") ?? -1;
  if (!email || at < 1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return domain === "upenn.edu" || domain.endsWith(".upenn.edu");
}
