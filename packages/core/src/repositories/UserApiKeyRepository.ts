import type { ApiKeyProvider, SavedApiKey, UserId } from "../types/index.js";

/**
 * Users' own LLM API keys, at most one per provider. Keys are stored in plain
 * text and must never reach the browser or tool code: pages and routes get
 * `list()`, and only the platform's LLM wiring calls `get()`.
 */
export interface UserApiKeyRepository {
  list(userId: UserId): Promise<SavedApiKey[]>;
  /** The saved key itself, or null if the user has none for this provider. */
  get(userId: UserId, provider: ApiKeyProvider): Promise<string | null>;
  /** Saves the key, replacing any key already saved for this provider. */
  set(userId: UserId, provider: ApiKeyProvider, key: string): Promise<SavedApiKey>;
  remove(userId: UserId, provider: ApiKeyProvider): Promise<void>;
}
