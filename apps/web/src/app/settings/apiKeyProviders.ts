// The providers a user can save an API key for, shared by the settings page
// and its server actions.

import type { ApiKeyProvider } from "@penntools/core/types";

export const API_KEY_PROVIDERS: Record<ApiKeyProvider, { label: string; prefix: string; consoleUrl: string }> = {
  openai: { label: "OpenAI", prefix: "sk-", consoleUrl: "https://platform.openai.com/api-keys" },
  anthropic: { label: "Anthropic", prefix: "sk-ant-", consoleUrl: "https://console.anthropic.com/settings/keys" },
};

export function isApiKeyProvider(value: unknown): value is ApiKeyProvider {
  return typeof value === "string" && Object.hasOwn(API_KEY_PROVIDERS, value);
}

/** Why `key` can't be a key for `provider`, or null if its format is fine. */
export function apiKeyFormatError(provider: ApiKeyProvider, key: string): string | null {
  const { label, prefix } = API_KEY_PROVIDERS[provider];
  if (!key) return `Paste your ${label} API key.`;
  if (/\s/.test(key) || key.length > 500) return `That doesn't look like an ${label} API key.`;
  if (provider === "openai" && key.startsWith(API_KEY_PROVIDERS.anthropic.prefix)) {
    return "That's an Anthropic key. Save it under Anthropic instead.";
  }
  if (!key.startsWith(prefix)) return `${label} API keys start with "${prefix}".`;
  return null;
}
