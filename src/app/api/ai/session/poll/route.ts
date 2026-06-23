import { NextResponse } from "next/server";
import { waitForJob } from "@/lib/ai/sessionBridge";

export const runtime = "nodejs";

export async function GET() {
  const job = await waitForJob();
  return NextResponse.json({ job });
}
