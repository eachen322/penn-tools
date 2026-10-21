// ─────────────────────────────────────────────────────────────────────────────
// The site's Tools menu, opened from the button at the left of the header.
//
// The menu lists every registered tool, so new tools appear on their own,
// except the ones below. They haven't moved to the current platform yet (they
// use the legacy LLM API, or only link elsewhere), so they stay registered but
// out of the menu. Delete a tool's ID when it's migrated; when the list is
// empty, delete it.
// ─────────────────────────────────────────────────────────────────────────────

import type { ToolManifest, ToolRegistry } from "@penntools/core/tools";

export const NOT_YET_MIGRATED: readonly string[] = ["1", "7", "8", "ai-compass", "penn-planner", "pitch-coach"];

export type MenuTool = Pick<ToolManifest, "id" | "title">;

/** The registered tools not in `hidden`, sorted by title. */
export function menuTools(
  registry: Pick<ToolRegistry, "listManifests">,
  hidden: readonly string[] = NOT_YET_MIGRATED,
): MenuTool[] {
  return registry
    .listManifests()
    .filter(({ id }) => !hidden.includes(id))
    .map(({ id, title }) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
