import { Tool } from "@penntools/core/tools";
import type { ToolManifest } from "@penntools/core/tools";

// The tool's title (listed in the site sidebar) and details (shown by the
// info button on its page). Its logic goes in other files in this folder,
// called from its page, routes and server actions in
// apps/web/src/app/tools/penn-pals/ (see section 4 of CLAUDE.md).
export class PennPalsTool extends Tool {
  readonly manifest: ToolManifest = {
    id: "penn-pals",
    title: "Penn Pals: Network Tracker",
    description: "Too many coffee chats, not enough memory? Debrief each conversation in plain language and get organized notes, next steps, and a reminder of who to follow up with this week. Networking, minus the spreadsheet.",
    contributors: ["Luana Marcondes", "Gabriela Juarez"],
    // Its section in the site sidebar and on the dashboard, one of TOOL_CATEGORIES
    // in @penntools/core/tools. To add a category, ask the Platform team.
    category: "Recruiting",
    // Shown as BETA until the tool is ready; delete this line then.
    beta: true,
  };
}
