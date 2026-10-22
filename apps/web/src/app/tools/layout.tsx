// Layout for every tool page: the info button in the corner and a centered
// 720px column, or the whole page area for tools whose manifest sets fullWidth.
// It reads the manifests here, on the server, and passes each tool's details down.

import { toolRegistry } from "@penntools/core/tools";
import "@/lib/container"; // registers the tools
import { toolPageInfo } from "@/lib/toolCatalog";
import { ToolsShell } from "@/components/layout/ToolsShell";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <ToolsShell tools={toolPageInfo(toolRegistry.listManifests())}>{children}</ToolsShell>;
}
