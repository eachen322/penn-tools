"use client";

// The site sidebar: every tool on the site by section (lib/toolCatalog.ts), to
// the left of every page. The hamburger at the left of the header
// (SidebarToggle) hides or shows it, and each section collapses with its name;
// SECTIONS_COOKIE remembers which, so the server renders them the same way.
//
// - Desktop: open unless the user hid it, which SIDEBAR_COOKIE remembers so the
//   server renders it the same way and it doesn't flash on load.
// - Narrow screens: a drawer over the page, closed until opened. It closes on
//   choosing a link, changing pages, Escape, or a click outside it.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CatalogSection } from "@/lib/toolCatalog";
import { SECTIONS_COOKIE, SIDEBAR_COOKIE } from "./sidebarCookie";
import styles from "./SiteSidebar.module.css";

/** Matches the breakpoint in SiteSidebar.module.css. */
const NARROW = "(max-width: 768px)";

interface SidebarState {
  open: boolean;
  drawerOpen: boolean;
  narrow: boolean;
  toggle: () => void;
  closeDrawer: () => void;
}

const SidebarContext = createContext<SidebarState | null>(null);

function useSidebar(): SidebarState {
  const state = useContext(SidebarContext);
  if (!state) throw new Error("The site sidebar needs a SidebarProvider (see the root layout).");
  return state;
}

export function SidebarProvider({ initialOpen, children }: { initialOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const pathname = usePathname();

  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const update = () => {
      setNarrow(query.matches);
      setDrawerOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  function toggle() {
    if (narrow) {
      setDrawerOpen((o) => !o);
      return;
    }
    const next = !open;
    setOpen(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "open" : "closed"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <SidebarContext.Provider value={{ open, drawerOpen, narrow, toggle, closeDrawer: () => setDrawerOpen(false) }}>
      {children}
    </SidebarContext.Provider>
  );
}

/** The hamburger at the left of the site header. */
export function SidebarToggle() {
  const { open, drawerOpen, narrow, toggle } = useSidebar();
  const expanded = narrow ? drawerOpen : open;
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-controls="site-sidebar"
      aria-expanded={expanded}
      aria-label={expanded ? "Hide tools" : "Show tools"}
      title={expanded ? "Hide tools" : "Show tools"}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function SiteSidebar({
  sections,
  initialCollapsed,
}: {
  sections: CatalogSection[];
  /** IDs of the sections the user collapsed, from SECTIONS_COOKIE. */
  initialCollapsed: string[];
}) {
  const { open, drawerOpen, closeDrawer } = useSidebar();
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const [collapsed, setCollapsed] = useState(() => new Set(initialCollapsed));

  function toggleSection(id: string) {
    const next = new Set(collapsed);
    if (!next.delete(id)) next.add(id);
    setCollapsed(next);
    document.cookie = `${SECTIONS_COOKIE}=${[...next].join(".")}; path=/; max-age=31536000; samesite=lax`;
  }

  const cls = [styles.sidebar, open ? "" : styles.closed, drawerOpen ? styles.drawerOpen : ""].join(" ");

  return (
    <>
      {drawerOpen && <div className={styles.scrim} onClick={closeDrawer} />}
      <nav
        id="site-sidebar"
        className={cls}
        aria-label="Tools"
        onClick={(e) => (e.target as HTMLElement).closest("a") && closeDrawer()}
      >
        <Link
          href="/"
          className={pathname === "/" ? `${styles.item} ${styles.current}` : styles.item}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <IconGrid />
          <span className={styles.label}>Dashboard</span>
        </Link>

        {sections.map((section) => {
          const expanded = !collapsed.has(section.id);
          return (
          <div key={section.id} className={styles.section}>
            <button
              type="button"
              className={styles.sectionToggle}
              onClick={() => toggleSection(section.id)}
              aria-expanded={expanded}
              aria-controls={`sidebar-${section.id}`}
            >
              <SectionIcon id={section.id} />
              <span className={styles.label}>{section.name}</span>
              {section.beta && <span className={styles.pill}>BETA</span>}
              <span className={expanded ? styles.chevron : `${styles.chevron} ${styles.chevronCollapsed}`}>
                <Svg size={14}><path d="m6 9 6 6 6-6" /></Svg>
              </span>
            </button>
            <ul id={`sidebar-${section.id}`} className={styles.tools} hidden={!expanded}>
              {section.tools.map((tool) => (
                <li key={tool.key}>
                  {tool.external ? (
                    <a href={tool.href} className={styles.tool} target="_blank" rel="noopener noreferrer">
                      <span className={styles.label}>{tool.title}</span>
                      <IconExternal />
                    </a>
                  ) : (
                    <Link
                      href={tool.href}
                      className={isCurrent(tool.href) ? `${styles.tool} ${styles.current}` : styles.tool}
                      aria-current={isCurrent(tool.href) ? "page" : undefined}
                    >
                      <span className={styles.label}>{tool.title}</span>
                      {tool.beta && !section.beta && <span className={styles.pill}>BETA</span>}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          );
        })}
      </nav>
    </>
  );
}

function Svg({ size = 16, children }: { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function IconGrid() {
  return <Svg><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></Svg>;
}

function IconExternal() {
  return <span className={styles.external}><Svg size={12}><path d="M7 17 17 7M8 7h9v9" /></Svg></span>;
}

function SectionIcon({ id }: { id: string }) {
  switch (id) {
    case "recruiting":
      return <Svg><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></Svg>;
    case "academics":
      return <Svg><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></Svg>;
    case "productivity":
      return <Svg><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></Svg>;
    case "llm-tools":
      return <Svg><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 17v4M17 19h4" /></Svg>;
    case "platform":
      return <Svg><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></Svg>;
    default:
      return <Svg><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>;
  }
}
