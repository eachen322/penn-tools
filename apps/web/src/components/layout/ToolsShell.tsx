"use client";

// The frame around a tool's pages (see app/tools/layout.tsx, which reads the
// manifests on the server): a centered column, or the whole page area for a
// full-width tool. The tool's name and info button are in the site header.

import { useSelectedLayoutSegment } from "next/navigation";
import styles from "./ToolsShell.module.css";

export function ToolsShell({ fullWidth, children }: { fullWidth: string[]; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const full = segment !== null && fullWidth.includes(segment);

  return (
    <div className={styles.container}>
      <main className={full ? `${styles.content} ${styles.contentFullBleed}` : styles.content}>
        {children}
      </main>
    </div>
  );
}
