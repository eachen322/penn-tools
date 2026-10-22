// ─────────────────────────────────────────────────────────────────────────────
// Tool base class
//
// Every PennTool extends this class and registers an instance in
// apps/web/src/lib/container.ts. The class holds the tool's manifest: its title
// is listed in the site sidebar, and the info button on its page shows its
// description and contributors. A tool's work happens in its own page, routes
// and server actions (apps/web/src/app/tools/{id}/), which call functions in
// the tool's package.
// ─────────────────────────────────────────────────────────────────────────────

// ── Tool metadata ─────────────────────────────────────────────────────────────

/**
 * The sections of the site sidebar and the dashboard, in the order they're
 * shown. Every tool, registered or community, belongs to one. "LLM Tools" is
 * the catch-all for tools that don't fit another.
 */
export const TOOL_CATEGORIES = ["Recruiting", "Academics", "Productivity", "LLM Tools", "Platform"] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export interface ToolManifest {
  /** Stable, kebab-case identifier. Never change after the tool ships. */
  id: string;
  title: string;
  description: string;
  /** GitHub usernames or display names of the people who built this tool. */
  contributors: string[];
  /** Student, faculty or staff mentor for this tool, if any. */
  mentor?: string;
  /** The tool's section in the site sidebar and on the dashboard. */
  category: ToolCategory;
  /** Shown as BETA: still under development, and may not be fully functional. */
  beta?: boolean;
  /**
   * The tool's pages fill the whole page area instead of the centered 720px
   * column, and the platform's info button is left out of the corner, where a
   * full-width page usually has its own header.
   */
  fullWidth?: boolean;
  /**
   * Still on the legacy LLM API (POST /api/llm/complete) rather than the AI API.
   * Not shown to users, except that the tool is shown as BETA until it migrates.
   * `pnpm check:tools` keeps it accurate: it fails if a tool calls the legacy API
   * without this, or has this and doesn't.
   */
  notYetMigrated?: boolean;
}

// ── Base class ────────────────────────────────────────────────────────────────

export abstract class Tool {
  abstract readonly manifest: ToolManifest;
}
