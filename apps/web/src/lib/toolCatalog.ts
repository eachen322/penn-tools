// ─────────────────────────────────────────────────────────────────────────────
// The tool catalog: every tool on the site, by section, for the site sidebar
// and the dashboard.
//
// Community tools (data/communityTools.ts) come first, by category. Then the
// registered tools, in the order container.ts registers them: the ones in
// PLATFORM_TOOLS under Platform, and every other one under LLM Tools, in beta.
// So a new tool appears in LLM Tools as soon as it's registered.
// ─────────────────────────────────────────────────────────────────────────────

import type { ToolManifest } from "@penntools/core/tools";
// Relative, not @/, so the unit tests (which have no path aliases) can load it.
import { CATEGORY_ORDER } from "../data/communityTools";
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
  beta: boolean;
  /** Screenshot of the tool's homepage, from scripts/capture-tool-screenshots.py. */
  preview: string;
}

export interface CatalogSection {
  /** The section's element ID on the dashboard, so it's linked as /#{id}. */
  id: string;
  name: string;
  /** Every tool in it is in beta, so the section is marked rather than each tool. */
  beta: boolean;
  tools: CatalogTool[];
}

/**
 * Registered tools shown under Platform rather than LLM Tools, because they
 * exercise the platform rather than serve students, and whether each is in beta.
 */
export const PLATFORM_TOOLS: Readonly<Record<string, { beta: boolean }>> = {
  "platform-playground": { beta: false },
  askpenn: { beta: true },
};

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
    beta: PLATFORM_TOOLS[m.id]?.beta ?? true,
    preview: `/dashboard/${m.id}.jpg`,
  };
}

/** The catalog's sections, leaving out empty ones. */
export function toolCatalog(
  manifests: readonly ToolManifest[],
  community: readonly CommunityTool[],
): CatalogSection[] {
  const rank = (name: string) => {
    const i = CATEGORY_ORDER.indexOf(name);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  const categories = Array.from(new Set(community.map((t) => t.category))).sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b),
  );

  const sections: CatalogSection[] = categories.map((name) => ({
    id: sectionId(name),
    name,
    beta: false,
    tools: community.filter((t) => t.category === name).map(fromCommunity),
  }));
  sections.push(
    {
      id: "llm-tools",
      name: "LLM Tools",
      beta: true,
      tools: manifests.filter((m) => !(m.id in PLATFORM_TOOLS)).map(fromManifest),
    },
    {
      id: "platform",
      name: "Platform",
      beta: false,
      tools: manifests.filter((m) => m.id in PLATFORM_TOOLS).map(fromManifest),
    },
  );
  return sections.filter((s) => s.tools.length > 0);
}
