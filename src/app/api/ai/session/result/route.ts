import { NextResponse } from "next/server";
import { completeJob } from "@/lib/ai/sessionBridge";
import type { ToolResult } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { jobId?: unknown; result?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const result = body.result as ToolResult | undefined;
  if (!result || typeof result !== "object" || !("ok" in result)) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  const ok = completeJob(jobId, result);
  if (!ok) {
    return NextResponse.json({ error: "Unknown or expired job" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
