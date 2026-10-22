// Root page — the PennTools dashboard: every tool on the site as a tile, in the
// same sections as the site sidebar (lib/toolCatalog.ts).

import { toolRegistry } from "@penntools/core/tools";
import "@/lib/container"; // registers the tools
import { communityTools } from "@/data/communityTools";
import { toolCatalog } from "@/lib/toolCatalog";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function HomePage() {
  return <Dashboard sections={toolCatalog(toolRegistry.listManifests(), communityTools)} />;
}
