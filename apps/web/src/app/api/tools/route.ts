// GET /api/tools — returns the manifests of all registered tools, for the
// info button on tool pages. Importing container.ts registers the tools.

import { NextResponse } from "next/server";
import { toolRegistry } from "@penntools/core/tools";
import "@/lib/container"; // side-effect: registers all tools

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(toolRegistry.listManifests());
}
