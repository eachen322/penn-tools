// ─────────────────────────────────────────────────────────────────────────────
// ToolRegistry
//
// Every tool registers its manifest in apps/web/src/lib/container.ts (server
// only). The registry feeds the site sidebar, the dashboard and the tool pages'
// info button. Tests can use their own `new ToolRegistry()`.
// ─────────────────────────────────────────────────────────────────────────────

import type { Tool, ToolManifest } from "./Tool.js";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  /** Registers a tool. Throws if its id is taken, so a duplicate fails loudly. */
  register(tool: Tool): void {
    const { id } = tool.manifest;
    if (this.tools.has(id)) {
      throw new Error(`ToolRegistry: a tool with id "${id}" is already registered. Tool ids must be unique.`);
    }
    this.tools.set(id, tool);
  }

  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  listManifests(): ToolManifest[] {
    return Array.from(this.tools.values(), (tool) => tool.manifest);
  }
}

/** The process's registry, filled by container.ts at startup. */
export const toolRegistry = new ToolRegistry();
