import type { ToolOutput } from "@penntools/core/tools";

export interface AskPennInput {
  prompt: string;
}

export interface AskPennOutput extends ToolOutput {}
