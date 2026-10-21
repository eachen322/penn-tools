// Ranks dashboard tools against a free-text query.
//
// Every word in the query must match some field of a tool; matches in the
// title count most, then category and keywords, then description and builders.

export interface SearchableTool {
  key: string;
  title: string;
  description: string;
  category: string;
  builders: string[];
  keywords: string[];
}

function scoreWord(tool: SearchableTool, word: string): number {
  const title = tool.title.toLowerCase();
  if (title.startsWith(word)) return 10;
  if (title.split(/\s+/).some((w) => w.startsWith(word))) return 8;
  if (title.includes(word)) return 6;
  if (tool.category.toLowerCase().includes(word)) return 4;
  if (tool.keywords.some((k) => k.toLowerCase().includes(word))) return 4;
  if (tool.builders.some((b) => b.toLowerCase().includes(word))) return 3;
  if (tool.description.toLowerCase().includes(word)) return 2;
  return 0;
}

export function searchTools<T extends SearchableTool>(tools: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return tools
    .map((tool) => {
      let score = 0;
      for (const word of words) {
        const s = scoreWord(tool, word);
        if (s === 0) return { tool, score: 0 };
        score += s;
      }
      return { tool, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.tool);
}
