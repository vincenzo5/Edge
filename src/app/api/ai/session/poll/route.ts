import { NextResponse } from "next/server";
import { readBridgeSecretFromRequest, requireBridgeAccess } from "@/lib/ai/bridgeAuth";
import { waitForJob } from "@/lib/ai/sessionBridge";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const bridgeSecret = readBridgeSecretFromRequest(request);
  const auth = requireBridgeAccess(bridgeSecret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const job = await waitForJob();
  return NextResponse.json({ job });
}
