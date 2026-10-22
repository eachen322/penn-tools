import { Tool } from "@penntools/core/tools";
import type { ToolManifest } from "@penntools/core/tools";

export class AskPennTool extends Tool {
  readonly manifest: ToolManifest = {
    id: "askpenn",
    title: "AskPenn",
    description: "Chat with an AI assistant for Penn students and staff, using your own OpenAI or Anthropic API key.",
    contributors: ["Platform team"],
    category: "Platform",
    beta: true,
  };
}
