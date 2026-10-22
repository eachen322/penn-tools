"use client";

// The frame around a tool's pages (see app/tools/layout.tsx, which reads the
// manifests on the server): the info button in the corner and a centered column,
// or, for a full-width tool, the whole page area and no info button. A page
// under /tools that isn't a registered tool gets the column and no button.

import { useSelectedLayoutSegment } from "next/navigation";
import type { ToolPageInfo } from "@/lib/toolCatalog";
import { ToolInfoButton } from "./ToolInfoButton";
import styles from "./ToolsShell.module.css";

export function ToolsShell({ tools, children }: { tools: Record<string, ToolPageInfo>; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const tool = segment === null ? undefined : tools[segment];
  const full = tool?.fullWidth === true;

  return (
    <div className={styles.container}>
      {tool && !full && (
        <div className={styles.infoCorner}>
          <ToolInfoButton tool={tool} />
        </div>
      )}
      <main className={full ? `${styles.content} ${styles.contentFullBleed}` : styles.content}>
        {children}
      </main>
    </div>
  );
}
