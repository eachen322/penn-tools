// Layout for every tool page: a centered 720px column, or the whole page area
// for tools whose manifest sets fullWidth, which it reads here on the server.

import { toolRegistry } from "@penntools/core/tools";
import "@/lib/container"; // registers the tools
import { fullWidthToolIds } from "@/lib/toolCatalog";
import { ToolsShell } from "@/components/layout/ToolsShell";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <ToolsShell fullWidth={fullWidthToolIds(toolRegistry.listManifests())}>{children}</ToolsShell>;
}
