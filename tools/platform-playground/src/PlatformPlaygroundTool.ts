import { Tool } from "@penntools/core/tools";
import type { ToolContext, ToolManifest } from "@penntools/core/tools";
import { isAIError } from "@penntools/core/ai";
import type { PlatformPlaygroundInput, PlatformPlaygroundOutput } from "./types.js";
import { generateAnswer } from "./demos.js";

export class PlatformPlaygroundTool extends Tool<PlatformPlaygroundInput, PlatformPlaygroundOutput> {
  readonly manifest: ToolManifest = {
    id: "platform-playground",
    title: "Platform Playground",
    description: "Working examples of the platform APIs, for teams building tools.",
    image: "Default",
    contributors: ["Ananya Chandra", "Ritika Agarwal", "Raven Kao"],
    mentor: "Ananya Chandra",
    version: "0.0.1",
    inceptionDate: "2026-03-14",
    latestReleaseDate: "2026-03-14",
  };

  /** One prompt, one answer. The Playground page doesn't use this; see demos.ts. */
  async execute(input: PlatformPlaygroundInput, context: ToolContext): Promise<PlatformPlaygroundOutput> {
    const [provider] = await context.ai.providers();
    if (!provider) {
      return { assistantMessage: "Add an OpenAI or Anthropic API key in Settings to use the Platform Playground." };
    }
    try {
      const result = await generateAnswer(context.ai, provider, input.prompt);
      return { assistantMessage: result.text };
    } catch (error) {
      if (isAIError(error)) return { assistantMessage: error.message };
      throw error;
    }
  }
}
