import { NextResponse } from "next/server";
import { listInteractiveCaptureSummaries } from "@/lib/patternLibrary/storage";

export const runtime = "nodejs";

export async function GET() {
  const records = listInteractiveCaptureSummaries();
  return NextResponse.json({ ok: true, records });
}
