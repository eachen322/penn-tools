import { describe, it, expect } from "vitest";
import type { ToolCategory, ToolManifest } from "@penntools/core/tools";
import type { CommunityTool } from "../../data/communityTools";
import { fullWidthToolIds, toolCatalog } from "../toolCatalog";

function manifest(id: string, category: ToolCategory, flags: Partial<ToolManifest> = {}): ToolManifest {
  return { id, title: id, description: "", contributors: [], category, ...flags };
}

function community(id: string, category: ToolCategory): CommunityTool {
  return { id, title: id, description: "", category, builder: "", url: `https://${id}.example` };
}

const outline = (sections: ReturnType<typeof toolCatalog>) =>
  sections.map((s) => [s.name, s.tools.map((t) => t.title)]);

describe("toolCatalog", () => {
  it("orders sections as TOOL_CATEGORIES does and leaves out empty ones", () => {
    const sections = toolCatalog(
      [manifest("pg", "Platform"), manifest("a", "LLM Tools")],
      [community("p", "Productivity"), community("r", "Recruiting")],
    );
    expect(sections.map((s) => [s.id, s.name])).toEqual([
      ["recruiting", "Recruiting"],
      ["productivity", "Productivity"],
      ["llm-tools", "LLM Tools"],
      ["platform", "Platform"],
    ]);
  });

  it("puts each tool in its category: community tools first, then registered ones in registration order", () => {
    const sections = toolCatalog(
      [manifest("b", "Recruiting"), manifest("a", "Recruiting")],
      [community("q", "Recruiting")],
    );
    expect(outline(sections)).toEqual([["Recruiting", ["q", "b", "a"]]]);
  });

  it("shows a tool as beta when its manifest says so or it hasn't migrated, and never a community tool", () => {
    const tools = toolCatalog(
      [
        manifest("done", "LLM Tools"),
        manifest("trying", "LLM Tools", { beta: true }),
        manifest("legacy", "LLM Tools", { notYetMigrated: true }),
      ],
      [community("q", "LLM Tools")],
    ).flatMap((s) => s.tools);
    expect(Object.fromEntries(tools.map((t) => [t.key, t.beta]))).toEqual({
      "community-q": false,
      "tool-done": false,
      "tool-trying": true,
      "tool-legacy": true,
    });
  });

  it("marks a section beta only when every tool in it is", () => {
    const sections = toolCatalog(
      [
        manifest("a", "LLM Tools", { notYetMigrated: true }),
        manifest("b", "LLM Tools", { beta: true }),
        manifest("c", "Platform", { beta: true }),
        manifest("d", "Platform"),
      ],
      [],
    );
    expect(sections.map((s) => [s.name, s.beta])).toEqual([
      ["LLM Tools", true],
      ["Platform", false],
    ]);
  });

  it("links registered tools to their pages and community tools out", () => {
    const tools = toolCatalog([manifest("a", "Academics")], [community("q", "Academics")]).flatMap((s) => s.tools);
    expect(tools.map((t) => [t.href, t.external])).toEqual([
      ["https://q.example", true],
      ["/tools/a", false],
    ]);
  });
});

describe("fullWidthToolIds", () => {
  it("lists only the tools whose manifest sets fullWidth", () => {
    expect(
      fullWidthToolIds([
        manifest("chat", "Platform", { fullWidth: true }),
        manifest("column", "LLM Tools"),
        manifest("explicit", "LLM Tools", { fullWidth: false }),
        manifest("canvas", "LLM Tools", { fullWidth: true }),
      ]),
    ).toEqual(["chat", "canvas"]);
  });
});
