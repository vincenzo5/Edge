import { NextResponse } from "next/server";
import { edgeToolRegistry } from "@/lib/ai/tools";

export const runtime = "nodejs";

export async function GET() {
  const tools = edgeToolRegistry.listDefinitionsForSession(false);
  return NextResponse.json({ tools });
}
