import { NextResponse } from "next/server";
import { edgeToolRegistry } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/adapters/execute";
import { createServerToolContext } from "@/lib/ai/adapters/http";
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

  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json({ error: "Missing tool name" }, { status: 400 });
  }

  const permissionMode =
    typeof body.permissionMode === "string" &&
    VALID_MODES.has(body.permissionMode as PermissionMode)
      ? (body.permissionMode as PermissionMode)
      : "read";

  const confirmed = body.confirmed === true;
  const context = createServerToolContext();

  const result = await executeTool(
    edgeToolRegistry,
    name,
    body.input ?? {},
    context,
    { permissionMode, confirmed },
  );

  const status = result.ok
    ? 200
    : result.code === "not_found"
      ? 404
      : result.code === "validation"
        ? 400
        : result.code === "permission_denied" ||
            result.code === "confirmation_required"
          ? 403
          : 422;

  return NextResponse.json(result, { status });
}
