// ─────────────────────────────────────────────────────────────────────────────
// The tool catalog: every tool on the site, by section, for the site sidebar
// and the dashboard.
//
// The sections are the categories in TOOL_CATEGORIES (@penntools/core/tools),
// in that order. Each holds the community tools in that category
// (data/communityTools.ts), then the registered tools whose manifest names it,
// in the order container.ts registers them. So a tool appears as soon as it's
// registered, wherever its manifest puts it.
// ─────────────────────────────────────────────────────────────────────────────

import { TOOL_CATEGORIES } from "@penntools/core/tools";
import type { ToolCategory, ToolManifest } from "@penntools/core/tools";
// Relative, not @/, so the unit tests (which have no path aliases) can load it.
import type { CommunityTool } from "../data/communityTools";

export interface CatalogTool {
  /** Unique across the catalog, for React keys. */
  key: string;
  title: string;
  description: string;
  builders: string[];
  href: string;
  /** Community tools live outside this repo and open in a new tab. */
  external: boolean;
  /** Its manifest says it's in beta, or it hasn't migrated off the legacy LLM API. */
  beta: boolean;
  /** Screenshot of the tool's homepage, from scripts/capture-tool-screenshots.py. */
  preview: string;
}

export interface CatalogSection {
  /** The section's element ID on the dashboard. */
  id: string;
  name: ToolCategory;
  /** Every tool in it is in beta, so the section is marked rather than each tool. */
  beta: boolean;
  tools: CatalogTool[];
}

function sectionId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function fromCommunity(t: CommunityTool): CatalogTool {
  return {
    key: `community-${t.id}`,
    title: t.title,
    description: t.description,
    builders: [t.builder],
    href: t.url,
    external: true,
    beta: false,
    preview: `/dashboard/${t.id}.jpg`,
  };
}

function fromManifest(m: ToolManifest): CatalogTool {
  return {
    key: `tool-${m.id}`,
    title: m.title,
    description: m.description,
    builders: m.contributors,
    href: `/tools/${m.id}`,
    external: false,
    beta: m.beta === true || m.notYetMigrated === true,
    preview: `/dashboard/${m.id}.jpg`,
  };
}

/**
 * What a tool's pages need from its manifest: the info button's details, and
 * whether the page is full-width and shows the button. Only these go to the
 * browser, not the whole manifest.
 */
export interface ToolPageInfo {
  title: string;
  description: string;
  contributors: string[];
  mentor: string | null;
  fullWidth: boolean;
  hideInfoButton: boolean;
}

/** Each registered tool's ToolPageInfo, by tool ID, for the tools layout. */
export function toolPageInfo(manifests: readonly ToolManifest[]): Record<string, ToolPageInfo> {
  return Object.fromEntries(
    manifests.map((m) => [
      m.id,
      {
        title: m.title,
        description: m.description,
        contributors: m.contributors,
        mentor: m.mentor || null,
        fullWidth: m.fullWidth === true,
        hideInfoButton: m.hideInfoButton === true,
      },
    ]),
  );
}

/** The catalog's sections, leaving out empty ones. */
export function toolCatalog(
  manifests: readonly ToolManifest[],
  community: readonly CommunityTool[],
): CatalogSection[] {
  return TOOL_CATEGORIES.map((name) => {
    const tools = [
      ...community.filter((t) => t.category === name).map(fromCommunity),
      ...manifests.filter((m) => m.category === name).map(fromManifest),
    ];
    return { id: sectionId(name), name, beta: tools.length > 0 && tools.every((t) => t.beta), tools };
  }).filter((s) => s.tools.length > 0);
}
