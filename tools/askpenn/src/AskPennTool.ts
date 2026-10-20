import { Tool } from "@penntools/core/tools";
import type { ToolContext, ToolManifest } from "@penntools/core/tools";
import { isAIError } from "@penntools/core/ai";
import type { AskPennInput, AskPennOutput } from "./types.js";
import { DEFAULT_REASONING, DEFAULT_TIER, SYSTEM_PROMPT } from "./conversation.js";

export class AskPennTool extends Tool<AskPennInput, AskPennOutput> {
  readonly manifest: ToolManifest = {
    id: "askpenn",
    title: "AskPenn",
    description: "Chat with an AI assistant for Penn students and staff, using your own OpenAI or Anthropic API key.",
    image: "Default",
    contributors: ["Platform team"],
    version: "0.0.1",
    inceptionDate: "2026-10-20",
    latestReleaseDate: "2026-10-20",
  };

  /** One question, one answer. The chat page doesn't use this; see conversation.ts. */
  async execute(input: AskPennInput, context: ToolContext): Promise<AskPennOutput> {
    const [provider] = await context.ai.providers();
    if (!provider) {
      return { assistantMessage: "Add an OpenAI or Anthropic API key in Settings to use AskPenn." };
    }
    try {
      const result = await context.ai.generate({
        provider,
        tier: DEFAULT_TIER,
        reasoning: DEFAULT_REASONING,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: input.prompt }],
      });
      return { assistantMessage: result.text };
    } catch (error) {
      if (isAIError(error)) return { assistantMessage: error.message };
      throw error;
    }
  }
}
