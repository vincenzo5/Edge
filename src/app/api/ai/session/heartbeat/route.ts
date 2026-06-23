import { NextResponse } from "next/server";
import { registerHeartbeat } from "@/lib/ai/sessionBridge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { sessionId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId : undefined;
  const session = registerHeartbeat(sessionId);

  return NextResponse.json(session);
}
