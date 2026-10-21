"use client";

import Link from "next/link";
import styles from "./DashboardSidebar.module.css";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  categories: { name: string; count: number }[];
  betaCount: number;
}

export function categoryAnchor(name: string): string {
  return `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function IconPanel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 17v4M17 19h4" />
    </svg>
  );
}

export function DashboardSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
  categories,
  betaCount,
}: DashboardSidebarProps) {
  const cls = [
    styles.sidebar,
    collapsed ? styles.collapsed : "",
    mobileOpen ? styles.mobileOpen : "",
  ].join(" ");

  return (
    <>
      {mobileOpen && <div className={styles.scrim} onClick={onCloseMobile} />}
      <aside className={cls} onClick={(e) => (e.target as HTMLElement).closest("a") && onCloseMobile()}>
        <div className={styles.header}>
          <Link href="/" className={styles.brand} title="PennTools">
            <img src="/wharton-ai-club-logo.png" alt="" className={styles.logo} />
            <span className={styles.label}>PennTools</span>
          </Link>
          <button
            className={styles.toggle}
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconPanel />
          </button>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={`${styles.item} ${styles.active}`} title="Dashboard">
            <IconGrid />
            <span className={styles.label}>Dashboard</span>
          </Link>
          <Link href="/ask" className={styles.item} title="AskPenn">
            <IconChat />
            <span className={styles.label}>AskPenn</span>
            <span className={`${styles.badge} ${styles.label}`}>BETA</span>
          </Link>
        </nav>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Categories</p>
          {categories.map((c) => (
            <a key={c.name} href={`#${categoryAnchor(c.name)}`} className={styles.item} title={c.name}>
              <span className={styles.dot} aria-hidden="true">{c.name.charAt(0)}</span>
              <span className={styles.label}>{c.name}</span>
              <span className={`${styles.count} ${styles.label}`}>{c.count}</span>
            </a>
          ))}
          {betaCount > 0 && (
            <a href="#beta" className={styles.item} title="BETA LLM Tools">
              <IconSparkle />
              <span className={styles.label}>BETA LLM Tools</span>
              <span className={`${styles.count} ${styles.label}`}>{betaCount}</span>
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
