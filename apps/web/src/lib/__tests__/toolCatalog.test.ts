import { describe, it, expect } from "vitest";
import type { ToolManifest } from "@penntools/core/tools";
import type { CommunityTool } from "../../data/communityTools";
import { toolCatalog } from "../toolCatalog";

function manifest(id: string, title = id): ToolManifest {
  return { id, title, description: "", contributors: [] };
}

function community(id: string, category: string): CommunityTool {
  return { id, title: id, description: "", category, builder: "", url: `https://${id}.example` };
}

const outline = (sections: ReturnType<typeof toolCatalog>) =>
  sections.map((s) => [s.name, s.tools.map((t) => t.title)]);

describe("toolCatalog", () => {
  it("puts community categories in CATEGORY_ORDER, then unknown ones by name", () => {
    const sections = toolCatalog([], [
      community("z", "Zebra"),
      community("p", "Productivity"),
      community("a", "Alpha"),
      community("r", "Recruiting"),
    ]);
    expect(sections.map((s) => s.name)).toEqual(["Recruiting", "Productivity", "Alpha", "Zebra"]);
  });

  it("puts registered tools in LLM Tools, except the Platform ones, in registration order", () => {
    const sections = toolCatalog(
      [manifest("platform-playground", "Platform Playground"), manifest("b", "B"), manifest("askpenn", "AskPenn"), manifest("a", "A")],
      [community("q", "Academics")],
    );
    expect(outline(sections)).toEqual([
      ["Academics", ["q"]],
      ["LLM Tools", ["B", "A"]],
      ["Platform", ["Platform Playground", "AskPenn"]],
    ]);
  });

  it("marks LLM tools and AskPenn as beta, and not community tools or the Platform Playground", () => {
    const tools = toolCatalog(
      [manifest("platform-playground"), manifest("askpenn"), manifest("a")],
      [community("q", "Academics")],
    ).flatMap((s) => s.tools);
    expect(Object.fromEntries(tools.map((t) => [t.key, t.beta]))).toEqual({
      "community-q": false,
      "tool-a": true,
      "tool-platform-playground": false,
      "tool-askpenn": true,
    });
  });

  it("links registered tools to their pages and community tools out", () => {
    const tools = toolCatalog([manifest("a")], [community("q", "Academics")]).flatMap((s) => s.tools);
    expect(tools.map((t) => [t.href, t.external])).toEqual([
      ["https://q.example", true],
      ["/tools/a", false],
    ]);
  });

  it("leaves out empty sections and gives each a URL-safe ID", () => {
    const sections = toolCatalog([manifest("a")], [community("q", "Career & Jobs")]);
    expect(sections.map((s) => s.id)).toEqual(["career-jobs", "llm-tools"]);
  });
});
