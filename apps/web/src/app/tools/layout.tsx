// Layout for every tool page: the info button in the corner and a centered
// 720px column, or the whole page area for tools whose manifest sets fullWidth.

import { toolRegistry } from "@penntools/core/tools";
import "@/lib/container"; // registers the tools
import { ToolsShell } from "@/components/layout/ToolsShell";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const fullWidth = toolRegistry
    .listManifests()
    .filter((m) => m.fullWidth)
    .map((m) => m.id);
  return <ToolsShell fullWidth={fullWidth}>{children}</ToolsShell>;
}
