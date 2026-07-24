import { NextResponse } from "next/server";
import { readBridgeSecretFromRequest, requireBridgeAccess } from "@/lib/ai/bridgeAuth";
import { registerHeartbeat } from "@/lib/ai/sessionBridge";
import { getCurrentUser } from "@/lib/persistence/auth/getCurrentUser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { sessionId?: unknown; bridgeSecret?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId : undefined;
  const bridgeSecret = readBridgeSecretFromRequest(
    request,
    typeof body.bridgeSecret === "string" ? body.bridgeSecret : undefined,
  );

  let userId: string | null | undefined;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const result = registerHeartbeat({ sessionId, bridgeSecret, userId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
