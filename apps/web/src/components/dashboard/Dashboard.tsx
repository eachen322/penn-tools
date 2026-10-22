"use client";

import { useState } from "react";
import type { CatalogSection, CatalogTool } from "@/lib/toolCatalog";
import styles from "./Dashboard.module.css";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function Dashboard({ sections }: { sections: CatalogSection[] }) {
  return (
    <div className={styles.content}>
      <header className={styles.hero}>
        <h1 className={styles.title}>PennTools</h1>
        <p className={styles.subtitle}>Tools built by the Penn community, all in one place.</p>
      </header>

      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={section.beta ? `${styles.section} ${styles.betaSection}` : styles.section}
        >
          {section.beta ? (
            <div className={styles.betaHeader}>
              <h2 className={`${styles.sectionLabel} ${styles.labelWithPill}`}>
                {section.name} <span className={styles.betaSticker}>BETA</span>
              </h2>
              <p className={styles.betaNote}>
                {section.id === "llm-tools" && "LLM-powered tools built on the PennTools platform. "}
                Tools in beta are still under development and may not be fully functional.
              </p>
            </div>
          ) : (
            <h2 className={styles.sectionLabel}>{section.name}</h2>
          )}
          <div className={styles.grid}>
            {section.tools.map((tool) => (
              <ToolTile key={tool.key} tool={tool} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ToolTile({ tool }: { tool: CatalogTool }) {
  // Tools without a captured screenshot keep the plain tile.
  const [hasPreview, setHasPreview] = useState(true);
  const external = tool.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <a
      href={tool.href}
      className={styles.tile}
      {...external}
    >
      {hasPreview && (
        <div className={styles.tilePreview}>
          <img
            src={tool.preview}
            alt=""
            loading="lazy"
            onError={() => setHasPreview(false)}
          />
        </div>
      )}
      <div className={styles.tileBody}>
        <div className={styles.tileHead}>
          <div className={styles.tileTitleWrap}>
            <h3 className={styles.tileTitle}>{tool.title}</h3>
            {tool.beta && <span className={styles.betaSticker}>BETA</span>}
          </div>
          {tool.external && (
            <svg className={styles.externalIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Opens in a new tab">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          )}
        </div>
        <p className={styles.tileDesc}>{tool.description}</p>
        <div className={styles.tileFoot}>
          <span className={styles.tileBuilders}>{tool.builders.join(", ")}</span>
          <span className={styles.tileMeta}>
            {tool.external ? hostOf(tool.href) : "PennTools"}
          </span>
        </div>
      </div>
    </a>
  );
}
