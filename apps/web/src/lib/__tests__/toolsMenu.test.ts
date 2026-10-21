import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ToolRegistry } from "@penntools/core/tools";
import type { Tool } from "@penntools/core/tools";
import { NOT_YET_MIGRATED, menuTools } from "../toolsMenu";

function registry(...tools: [id: string, title: string][]) {
  const registry = new ToolRegistry();
  for (const [id, title] of tools) {
    registry.register({ manifest: { id, title, description: "", contributors: [] } } satisfies Tool);
  }
  return registry;
}

describe("menuTools", () => {
  it("lists every registered tool, sorted by title", () => {
    expect(menuTools(registry(["b", "Beta"], ["a", "Alpha"]), [])).toEqual([
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
    ]);
  });

  it("leaves out the hidden tools", () => {
    expect(menuTools(registry(["a", "Alpha"], ["old", "Old Tool"]), ["old"])).toEqual([{ id: "a", title: "Alpha" }]);
  });

  it("ignores hidden IDs that aren't registered", () => {
    expect(menuTools(registry(["a", "Alpha"]), ["gone"])).toEqual([{ id: "a", title: "Alpha" }]);
  });
});

describe("NOT_YET_MIGRATED", () => {
  it("lists each tool once", () => {
    expect(new Set(NOT_YET_MIGRATED).size).toBe(NOT_YET_MIGRATED.length);
  });

  // A tool that's been renamed or deleted should come off the list.
  it.each(NOT_YET_MIGRATED)("%s still has a page", (id) => {
    expect(existsSync(fileURLToPath(new URL(`../../app/tools/${id}/page.tsx`, import.meta.url)))).toBe(true);
  });
});
