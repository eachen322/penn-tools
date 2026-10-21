"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ToolManifest } from "@penntools/core/tools";
import { communityTools, CATEGORY_ORDER } from "@/data/communityTools";
import { searchTools, type SearchableTool } from "@/lib/searchTools";
import { DashboardSidebar, categoryAnchor } from "./DashboardSidebar";
import styles from "./Dashboard.module.css";

export interface DashboardTool extends SearchableTool {
  href: string;
  external: boolean;
  beta: boolean;
  image?: string | undefined;
  /** Screenshot of the tool's homepage, from scripts/capture-tool-screenshots.py. */
  preview: string;
}

const COLLAPSED_KEY = "penntools_sidebar_collapsed";

/** Registered tools that exist to exercise the platform rather than for students. */
const PLATFORM_TOOL_IDS = new Set(["platform-playground"]);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const COMMUNITY: DashboardTool[] = communityTools.map((t) => ({
  key: `community-${t.id}`,
  title: t.title,
  description: t.description,
  category: t.category,
  builders: [t.builder],
  keywords: t.keywords ?? [],
  href: t.url,
  preview: `/dashboard/${t.id}.jpg`,
  external: true,
  beta: false,
}));

function fromManifest(m: ToolManifest): DashboardTool {
  const platform = PLATFORM_TOOL_IDS.has(m.id);
  return {
    key: `internal-${m.id}`,
    title: m.title,
    description: m.description,
    category: platform ? "Platform" : "LLM Tools",
    builders: m.contributors,
    keywords: platform ? ["platform", "api", "test"] : ["beta", "llm", "ai"],
    href: `/tools/${m.id}`,
    preview: `/dashboard/${m.id}.jpg`,
    external: false,
    beta: !platform,
    image: m.image && m.image !== "Default" ? m.image : undefined,
  };
}

export function Dashboard() {
  const [internalTools, setInternalTools] = useState<DashboardTool[]>([]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then((manifests: ToolManifest[]) => setInternalTools(manifests.map(fromManifest)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {}
  }, []);

  // "/" focuses the search bar from anywhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(target.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  const categories = useMemo(() => {
    const names = Array.from(new Set(COMMUNITY.map((t) => t.category)));
    names.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
    return names.map((name) => ({
      name,
      tools: COMMUNITY.filter((t) => t.category === name),
    }));
  }, []);

  const llmTools = internalTools.filter((t) => t.category === "LLM Tools");
  const platformTools = internalTools.filter((t) => t.category === "Platform");

  const results = useMemo(
    () => searchTools([...COMMUNITY, ...internalTools], query),
    [internalTools, query],
  );
  const searching = query.trim().length > 0;

  function openTool(tool: DashboardTool) {
    if (tool.external) window.open(tool.href, "_blank", "noopener,noreferrer");
    else window.location.href = tool.href;
  }

  return (
    <div className={styles.shell}>
      <DashboardSidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        categories={categories.map((c) => ({ name: c.name, count: c.tools.length }))}
        llmCount={llmTools.length}
        platformCount={platformTools.length}
      />

      <main className={styles.main}>
        <div className={styles.topBar}>
          <button
            className={styles.menuBtn}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <a
            className={styles.githubLink}
            href="https://github.com/whartonAIclub/penn-tools"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Penn Tools GitHub repository"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.githubIcon}>
              <path
                fill="currentColor"
                d="M12 2C6.477 2 2 6.589 2 12.248c0 4.526 2.865 8.367 6.839 9.722.5.095.682-.223.682-.496 0-.245-.009-.894-.014-1.754-2.782.617-3.369-1.38-3.369-1.38-.455-1.184-1.11-1.5-1.11-1.5-.908-.637.069-.624.069-.624 1.004.072 1.532 1.056 1.532 1.056.892 1.566 2.341 1.114 2.91.852.091-.665.349-1.114.635-1.37-2.221-.259-4.556-1.14-4.556-5.074 0-1.121.39-2.037 1.03-2.755-.103-.26-.447-1.307.098-2.725 0 0 .84-.277 2.75 1.052A9.303 9.303 0 0 1 12 6.965c.85.004 1.705.117 2.504.344 1.909-1.33 2.748-1.052 2.748-1.052.546 1.418.202 2.465.1 2.725.64.718 1.028 1.634 1.028 2.755 0 3.944-2.338 4.812-4.566 5.067.359.32.678.951.678 1.917 0 1.384-.012 2.5-.012 2.84 0 .275.18.596.688.495C19.138 20.612 22 16.772 22 12.248 22 6.589 17.523 2 12 2Z"
              />
            </svg>
            <span className={styles.githubText}>Github</span>
          </a>
        </div>

        <div className={styles.content}>
          <header className={styles.hero}>
            <h1 className={styles.title}>PennTools</h1>
            <p className={styles.subtitle}>Tools built by the Penn community, all in one place.</p>

            <form
              className={styles.searchPill}
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (results[0]) openTool(results[0]);
              }}
            >
              <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                className={styles.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder="Search tools: calendar, internships, resume…"
                aria-label="Search tools"
              />
              {searching ? (
                <button type="button" className={styles.clearBtn} onClick={() => setQuery("")} aria-label="Clear search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <kbd className={styles.kbd}>/</kbd>
              )}
            </form>
          </header>

          {searching ? (
            <section className={styles.section}>
              <p className={styles.sectionLabel}>
                {results.length === 0
                  ? `No tools match “${query.trim()}”`
                  : `${results.length} result${results.length === 1 ? "" : "s"} · press Enter to open the best match`}
              </p>
              {results.length > 0 && (
                <div className={styles.grid}>
                  {results.map((tool, i) => (
                    <ToolTile key={tool.key} tool={tool} bestMatch={i === 0} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {categories.map((cat) => (
                <section key={cat.name} id={categoryAnchor(cat.name)} className={styles.section}>
                  <h2 className={styles.sectionLabel}>{cat.name}</h2>
                  <div className={styles.grid}>
                    {cat.tools.map((tool) => (
                      <ToolTile key={tool.key} tool={tool} />
                    ))}
                  </div>
                </section>
              ))}

              {llmTools.length > 0 && (
                <section id="llm-tools" className={`${styles.section} ${styles.betaSection}`}>
                  <div className={styles.betaHeader}>
                    <h2 className={`${styles.sectionLabel} ${styles.labelWithPill}`}>
                      LLM Tools <span className={styles.betaSticker}>BETA</span>
                    </h2>
                    <p className={styles.betaNote}>
                      LLM-powered tools built on the PennTools platform. Add your API key in{" "}
                      <a href="/ask">AskPenn</a> to use them.
                    </p>
                  </div>
                  <div className={styles.grid}>
                    {llmTools.map((tool) => (
                      <ToolTile key={tool.key} tool={tool} />
                    ))}
                  </div>
                </section>
              )}

              {platformTools.length > 0 && (
                <section id="platform" className={styles.section}>
                  <h2 className={styles.sectionLabel}>Platform</h2>
                  <div className={styles.grid}>
                    {platformTools.map((tool) => (
                      <ToolTile key={tool.key} tool={tool} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ToolTile({ tool, bestMatch = false }: { tool: DashboardTool; bestMatch?: boolean }) {
  // Tools without a captured screenshot keep the plain tile.
  const [hasPreview, setHasPreview] = useState(true);
  const external = tool.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <a
      href={tool.href}
      className={`${styles.tile} ${bestMatch ? styles.tileBest : ""}`}
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
          {tool.image && <img src={tool.image} alt="" className={styles.tileIcon} />}
          <div className={styles.tileTitleWrap}>
            <h3 className={styles.tileTitle}>{tool.title}</h3>
            {tool.beta && <span className={styles.betaSticker}>BETA</span>}
            {bestMatch && <span className={styles.bestSticker}>Best match</span>}
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
