// Only Penn accounts can sign in (see the signIn callback in lib/auth.ts). Kept
// apart from auth.ts, which is server-only, so the unit tests can load it.

/**
 * Where sign-in sends a Google account that isn't a Penn one: the page in
 * app/penn-only/. A test checks that the page exists at this path.
 */
export const PENN_ONLY_PAGE = "/penn-only";

/** Whether `email` is at upenn.edu or a Penn school's subdomain, such as wharton.upenn.edu. */
export function isPennEmail(email: string | null | undefined): boolean {
  const at = email?.lastIndexOf("@") ?? -1;
  if (!email || at < 1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return domain === "upenn.edu" || domain.endsWith(".upenn.edu");
}
