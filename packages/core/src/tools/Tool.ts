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

export interface ToolManifest {
  /** Stable, kebab-case identifier. Never change after the tool ships. */
  id: string;
  title: string;
  description: string;
  /** GitHub usernames or display names of the people who built this tool. */
  contributors: string[];
  /** Student, faculty or staff mentor for this tool, if any. */
  mentor?: string;
}

// ── Base class ────────────────────────────────────────────────────────────────

export abstract class Tool {
  abstract readonly manifest: ToolManifest;
}
