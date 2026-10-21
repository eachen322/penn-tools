import { Tool } from "@penntools/core/tools";
import type { ToolManifest } from "@penntools/core/tools";

export class AiCompassTool extends Tool {
  readonly manifest: ToolManifest = {
    id: "ai-compass",
    title: "AI Compass",
    description: "Describe your AI use case, get ranked model recommendations with cost estimates and tradeoffs across 62 models from 29 providers.",
    contributors: ["Akshit Kalra"],
    mentor: "",
  };
}
