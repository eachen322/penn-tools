"use client";

// The info button in the corner of a tool's pages: opens the tool's
// description, contributors and mentor, which ToolsShell passes in.

import { useState } from "react";
import type { ToolPageInfo } from "@/lib/toolCatalog";
import styles from "./ToolInfoButton.module.css";

export function ToolInfoButton({ tool }: { tool: ToolPageInfo }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.iconButton}
        onClick={() => setOpen((o) => !o)}
        aria-label="Tool information"
        aria-expanded={open}
      >
        <InfoIcon />
      </button>
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.popup} role="dialog" aria-label="Tool info">
            <Row label={tool.title} value={tool.description} />
            <Row label="Contributors" value={tool.contributors.join(", ")} />
            {tool.mentor && <Row label="Mentor" value={tool.mentor} />}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
