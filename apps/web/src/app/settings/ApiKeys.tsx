"use client";

// One row per provider on the settings page: paste and save a key, or see the
// saved key's last four characters and replace or remove it.

import { useState, useTransition, type FormEvent } from "react";
import type { ApiKeyProvider, SavedApiKey } from "@penntools/core/types";
import buttons from "@/components/layout/Buttons.module.css";
import cardPage from "@/components/layout/CardPage.module.css";
import { API_KEY_PROVIDERS } from "./apiKeyProviders";
import { removeApiKey, saveApiKey } from "./actions";
import styles from "./page.module.css";

export function ApiKeys({ saved }: { saved: SavedApiKey[] }) {
  return (
    <div>
      {(Object.keys(API_KEY_PROVIDERS) as ApiKeyProvider[]).map((provider) => (
        <ApiKeyRow
          key={provider}
          provider={provider}
          initial={saved.find((k) => k.provider === provider) ?? null}
        />
      ))}
    </div>
  );
}

function ApiKeyRow({ provider, initial }: { provider: ApiKeyProvider; initial: SavedApiKey | null }) {
  const { label, prefix, consoleUrl } = API_KEY_PROVIDERS[provider];
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      let result;
      try {
        result = await saveApiKey(provider, value);
      } catch {
        setError("Couldn't save your key. Try again.");
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(result.saved);
      setValue("");
      setError(null);
      setEditing(false);
    });
  }

  function replace() {
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setValue("");
    setError(null);
    setEditing(false);
  }

  function remove() {
    // Providers show a key only once, so the user may not be able to get it back.
    if (!window.confirm(`Remove your saved ${label} API key?`)) return;
    startTransition(async () => {
      let result;
      try {
        result = await removeApiKey(provider);
      } catch {
        setError("Couldn't remove your key. Try again.");
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(null);
      setError(null);
      setEditing(true);
    });
  }

  return (
    <div className={styles.keyRow}>
      <div className={styles.keyHeader}>
        <div>
          <p><strong>{label}</strong></p>
          <p className={cardPage.muted}>
            {saved ? (
              <>Saved key ending in <code>{saved.last4}</code></>
            ) : (
              <>
                No key saved.{" "}
                <a href={consoleUrl} target="_blank" rel="noreferrer" className={styles.link}>
                  Create one
                </a>
              </>
            )}
          </p>
        </div>
        {saved && !editing && (
          <div className={styles.keyControls}>
            <button type="button" className={buttons.ghost} onClick={replace} disabled={pending}>
              Replace
            </button>
            <button type="button" className={buttons.ghost} onClick={remove} disabled={pending}>
              Remove
            </button>
          </div>
        )}
      </div>

      {editing && (
        <form className={styles.keyControls} onSubmit={save}>
          <input
            type="password"
            className={styles.keyInput}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${prefix}…`}
            aria-label={`${label} API key`}
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
          />
          <button type="submit" className={buttons.primary} disabled={pending || !value.trim()}>
            {pending ? "Checking…" : "Save"}
          </button>
          {saved && (
            <button type="button" className={buttons.ghost} onClick={cancel} disabled={pending}>
              Cancel
            </button>
          )}
        </form>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
