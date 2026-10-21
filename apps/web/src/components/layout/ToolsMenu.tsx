"use client";

// The Tools menu: a button at the left of the site header that opens a panel
// listing the tools from menuTools() (lib/toolsMenu.ts). The panel sits under the
// header and over the page, so it never changes a tool's layout. It closes on
// choosing a tool, changing pages, Escape, or a click outside it.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuTool } from "@/lib/toolsMenu";
import styles from "./ToolsMenu.module.css";

export function ToolsMenu({ tools }: { tools: MenuTool[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  // While open, focus starts on the first tool, and Escape closes the menu and
  // returns focus to the button.
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector("a")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        aria-label="Tools"
        aria-expanded={open}
        title="Tools"
      >
        <MenuIcon />
      </button>
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <nav ref={panel} className={styles.panel} aria-label="Tools">
            <h2 className={styles.heading}>Tools</h2>
            {tools.length === 0 ? (
              <p className={styles.empty}>No tools yet.</p>
            ) : (
              <ul className={styles.list}>
                {tools.map((tool) => {
                  const href = `/tools/${tool.id}`;
                  const current = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={tool.id}>
                      <Link
                        href={href}
                        className={current ? `${styles.link} ${styles.current}` : styles.link}
                        aria-current={current ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        {tool.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
