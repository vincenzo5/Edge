import { NextResponse } from "next/server";
import { enqueueSessionExecution } from "@/lib/ai/sessionBridge";
import type { PermissionMode } from "@/lib/ai/types";

export const runtime = "nodejs";

const VALID_MODES = new Set<PermissionMode>(["read", "write", "full"]);

export async function POST(request: Request) {
  let body: {
    name?: unknown;
    input?: unknown;
    permissionMode?: unknown;
    confirmed?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Missing tool name" }, { status: 400 });
  }

  const permissionMode =
    typeof body.permissionMode === "string" &&
    VALID_MODES.has(body.permissionMode as PermissionMode)
      ? (body.permissionMode as PermissionMode)
      : "read";

  const confirmed = body.confirmed === true;

  const result = await enqueueSessionExecution(name, body.input ?? {}, {
    permissionMode,
    confirmed,
  });

  const status = result.ok
    ? 200
    : result.code === "requires_client_session"
      ? 503
      : 422;

  return NextResponse.json(result, { status });
}
