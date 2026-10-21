"use client";

import Link from "next/link";
import styles from "./DashboardSidebar.module.css";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  categories: { name: string; count: number }[];
  llmCount: number;
  platformCount: number;
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

function IconSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 17v4M17 19h4" />
    </svg>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function CategoryIcon({ name }: { name: string }) {
  switch (name) {
    case "Recruiting":
      return <Svg><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></Svg>;
    case "Academics":
      return <Svg><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></Svg>;
    case "Productivity":
      return <Svg><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></Svg>;
    default:
      return <Svg><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>;
  }
}

function IconPlatform() {
  return <Svg><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></Svg>;
}

export function DashboardSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
  categories,
  llmCount,
  platformCount,
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
        </nav>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Categories</p>
          {categories.map((c) => (
            <a key={c.name} href={`#${categoryAnchor(c.name)}`} className={styles.item} title={c.name}>
              <CategoryIcon name={c.name} />
              <span className={styles.label}>{c.name}</span>
              <span className={`${styles.count} ${styles.label}`}>{c.count}</span>
            </a>
          ))}
          {llmCount > 0 && (
            <a href="#llm-tools" className={styles.item} title="LLM Tools">
              <IconSparkle />
              <span className={styles.label}>LLM Tools</span>
              <span className={`${styles.pill} ${styles.label}`}>BETA</span>
              <span className={`${styles.count} ${styles.label}`}>{llmCount}</span>
            </a>
          )}
          {platformCount > 0 && (
            <a href="#platform" className={styles.item} title="Platform">
              <IconPlatform />
              <span className={styles.label}>Platform</span>
              <span className={`${styles.count} ${styles.label}`}>{platformCount}</span>
            </a>
          )}
        </div>

        {/* Bottom: user */}
        <div className={styles.userRow} title="Anonymous">
          <div className={styles.avatar}>A</div>
          <span className={`${styles.userName} ${styles.label}`}>Anonymous</span>
        </div>
      </aside>
    </>
  );
}
