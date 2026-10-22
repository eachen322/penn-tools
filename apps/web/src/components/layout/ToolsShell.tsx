"use client";

// The frame around a tool's pages (see app/tools/layout.tsx, which reads the
// manifests on the server): the info button in the corner and a centered column,
// or, for the tools in `fullWidth`, the whole page area and no info button.

import { useSelectedLayoutSegment } from "next/navigation";
import { ToolInfoButton } from "./ToolInfoButton";
import styles from "./ToolsShell.module.css";

export function ToolsShell({ fullWidth, children }: { fullWidth: string[]; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const full = segment !== null && fullWidth.includes(segment);

  return (
    <div className={styles.container}>
      {!full && (
        <div className={styles.infoCorner}>
          <ToolInfoButton />
        </div>
      )}
      <main className={full ? `${styles.content} ${styles.contentFullBleed}` : styles.content}>
        {children}
      </main>
    </div>
  );
}
