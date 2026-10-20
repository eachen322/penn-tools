"use client";

// The AskPenn chat: a sidebar of the user's chats, the open chat's thread, and
// the message box. Replies stream from stream/route.ts.

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import type { AIProvider, AIReasoning, AIStreamEvent, AITier } from "@penntools/core/ai";
import type { ChatMessage, ChatSummary } from "@penntools/tool-askpenn";
import { loadChat, loadChats } from "./actions";
import styles from "./AskPenn.module.css";

interface ShownError {
  kind?: string;
  message: string;
}

/** A message in the thread; an error stands in for a reply that failed (it isn't saved). */
type ShownMessage = ChatMessage & { error?: ShownError };

type StreamEvent = AIStreamEvent | { type: "chat"; chatId: string } | { type: "error"; error: ShownError };

/** The user's choices for replies, remembered in this browser. */
interface ReplySettings {
  provider: AIProvider;
  tier: AITier;
  reasoning: AIReasoning;
}

const SPEEDS: Record<AITier, string> = { fast: "Fast", standard: "Balanced", best: "Best" };
const THINKING: Record<AIReasoning, string> = { low: "Low", medium: "Medium", high: "High" };

const KEY_PROBLEMS = new Set(["missing_key", "invalid_key", "no_credit"]);
const SETTINGS_STORAGE_KEY = "askpenn_settings";
const URL_RE = /(https?:\/\/[^\s)]+)/g;

export function AskPenn({
  initialChats,
  providers,
  labels,
  defaultTier,
  defaultReasoning,
  maxMessageLength,
}: {
  initialChats: ChatSummary[];
  /** Providers the user has saved keys for; never empty. */
  providers: AIProvider[];
  labels: Record<AIProvider, string>;
  defaultTier: AITier;
  defaultReasoning: AIReasoning;
  /** The server rejects longer messages, so the message box stops there. */
  maxMessageLength: number;
}) {
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ShownMessage[]>([]);
  const [settings, setSettings] = useState<ReplySettings>({
    provider: providers[0]!,
    tier: defaultTier,
    reasoning: defaultReasoning,
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const openingRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore last time's choices, keeping only ones that are still valid (the
  // user may have removed a key since).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}") as Partial<ReplySettings>;
      setSettings((current) => ({
        provider: saved.provider && providers.includes(saved.provider) ? saved.provider : current.provider,
        tier: saved.tier && Object.hasOwn(SPEEDS, saved.tier) ? saved.tier : current.tier,
        reasoning: saved.reasoning && Object.hasOwn(THINKING, saved.reasoning) ? saved.reasoning : current.reasoning,
      }));
    } catch {
      // storage unavailable or unreadable: keep the defaults
    }
  }, [providers]);

  // The page can come from the browser's cache of recently visited pages, so
  // fetch the current chat list rather than trusting initialChats.
  useEffect(() => {
    loadChats().then(setChats, () => {});
  }, []);

  // Stop a reply in progress when the user leaves the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function choose(change: Partial<ReplySettings>) {
    const next = { ...settings, ...change };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable: the choice lasts until reload
    }
  }

  function newChat() {
    openingRef.current = null;
    setActiveChatId(null);
    setMessages([]);
  }

  async function openChat(chatId: string) {
    if (chatId === activeChatId) return;
    openingRef.current = chatId;
    setActiveChatId(chatId);
    setMessages([]);
    let loaded: ChatMessage[] | null;
    try {
      loaded = await loadChat(chatId);
    } catch {
      loaded = null;
    }
    if (openingRef.current !== chatId) return; // the user opened another chat meanwhile
    setMessages(loaded ?? [{ role: "assistant", content: "", error: { message: "Couldn't load this chat. Try again." } }]);
  }

  async function send() {
    const content = input.trim();
    if (!content || busy) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);

    // The reply is the last message; text streams into it, or an error replaces it.
    const updateReply = (update: (reply: ShownMessage) => ShownMessage) =>
      setMessages((m) => [...m.slice(0, -1), update(m.at(-1)!)]);
    const fail = (error: ShownError) => updateReply(() => ({ role: "assistant", content: "", error }));

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/tools/askpenn/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeChatId, ...settings, content }),
        signal: controller.signal,
      });
      if (res.status === 401) return fail({ message: "Sign in with the button at the top right to keep chatting." });
      if (!res.ok || !res.body) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        return fail({ message: error ?? "Something went wrong. Try again." });
      }

      // Server-sent events: one "data: <json>" per event, separated by blank lines.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const event = JSON.parse(part.slice(6)) as StreamEvent;
          if (event.type === "chat") {
            openingRef.current = event.chatId;
            setActiveChatId(event.chatId);
          } else if (event.type === "text") {
            updateReply((reply) => ({ ...reply, content: reply.content + event.delta }));
          } else if (event.type === "done") {
            finished = true;
            if (!event.result.text.trim()) fail({ message: "AskPenn couldn't answer that. Try rephrasing." });
          } else {
            finished = true;
            fail(event.error);
          }
        }
      }
      if (!finished) fail({ message: "The reply was interrupted. Try again." });
    } catch {
      if (!controller.signal.aborted) fail({ message: "Couldn't reach AskPenn. Check your connection and try again." });
    } finally {
      abortRef.current = null;
      setBusy(false);
      loadChats().then(setChats, () => {});
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function growTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  const composer = (
    <div className={styles.composer}>
      <div className={styles.pill}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={growTextarea}
          placeholder="Ask anything"
          maxLength={maxMessageLength}
          rows={1}
          disabled={busy}
        />
        <button
          className={[styles.sendBtn, input.trim() && !busy ? styles.sendActive : ""].join(" ")}
          onClick={() => void send()}
          disabled={!input.trim() || busy}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 4l8 16-8-4-8 4 8-16z" />
          </svg>
        </button>
      </div>
      <div className={styles.settings}>
        {providers.length > 1 && (
          <Choice
            label="Provider"
            value={settings.provider}
            options={Object.fromEntries(providers.map((p) => [p, labels[p]])) as Record<AIProvider, string>}
            onChange={(provider) => choose({ provider })}
            disabled={busy}
          />
        )}
        <Choice
          label="Speed"
          title="Faster models cost less on your API key; Best is the most capable."
          value={settings.tier}
          options={SPEEDS}
          onChange={(tier) => choose({ tier })}
          disabled={busy}
        />
        <Choice
          label="Thinking"
          title="More thinking can give better answers to hard questions, but takes longer and costs more."
          value={settings.reasoning}
          options={THINKING}
          onChange={(reasoning) => choose({ reasoning })}
          disabled={busy}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <button className={styles.newChat} onClick={newChat} disabled={busy}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          New chat
        </button>
        {chats.length > 0 && <p className={styles.sectionLabel}>Chats</p>}
        <nav className={styles.chatList}>
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={[styles.chatItem, chat.id === activeChatId ? styles.active : ""].join(" ")}
              onClick={() => void openChat(chat.id)}
              disabled={busy}
              title={chat.title}
            >
              <span className={styles.chatTitle}>{chat.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.main}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.taglineWrap}>
              <h1 className={styles.tagline}>AskPenn</h1>
              <span className={styles.betaSticker}>BETA</span>
            </div>
            {composer}
          </div>
        ) : (
          <>
            <div className={styles.thread}>
              {messages.map((message, i) => (
                <Bubble key={i} message={message} thinking={busy && i === messages.length - 1 && !message.content} />
              ))}
              <div ref={bottomRef} />
            </div>
            <div className={styles.inputBottom}>{composer}</div>
          </>
        )}
      </main>
    </div>
  );
}

/** A labelled dropdown under the message box. */
function Choice<T extends string>({
  label,
  title,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  title?: string;
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <label className={styles.choice} title={title}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled}>
        {(Object.entries(options) as [T, string][]).map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Bubble({ message, thinking }: { message: ShownMessage; thinking: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={[styles.row, isUser ? styles.rowUser : ""].join(" ")}>
      {!isUser && (
        <div className={styles.avatar} aria-hidden>
          A
        </div>
      )}
      <div className={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant].join(" ")}>
        {message.error ? (
          <p className={styles.error}>
            {message.error.message}
            {message.error.kind && KEY_PROBLEMS.has(message.error.kind) && (
              <>
                {" "}
                <Link href="/settings" className={styles.link}>
                  Open Settings
                </Link>
              </>
            )}
          </p>
        ) : thinking ? (
          <div className={styles.thinking} aria-label="AskPenn is replying">
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        ) : (
          <p className={styles.content}>
            <Linkify text={message.content} />
          </p>
        )}
      </div>
    </div>
  );
}

function Linkify({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        // split() with a capturing group puts the URLs at odd indexes.
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
