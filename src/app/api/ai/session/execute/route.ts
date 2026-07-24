import { NextResponse } from "next/server";
import { edgeToolRegistry } from "@/lib/ai/tools";
import { executeClientSessionTool } from "@/lib/ai/sessionBridge";
import {
  parseExecuteToolBody,
  toolExecuteHttpStatus,
} from "@/lib/ai/adapters/parseExecuteBody";
import { readBridgeSecretFromRequest, requireBridgeOrApiKey } from "@/lib/ai/bridgeAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bridgeSecret = readBridgeSecretFromRequest(
    request,
    typeof body.bridgeSecret === "string" ? body.bridgeSecret : undefined,
  );
  const auth = requireBridgeOrApiKey(request, bridgeSecret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = parseExecuteToolBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, input, executeOptions } = parsed.value;
  const tool = edgeToolRegistry.get(name);
  if (!tool) {
    return NextResponse.json(
      { ok: false, error: `Unknown tool: ${name}`, code: "not_found" },
      { status: 404 },
    );
  }
  if (tool.requiresClientSession !== true) {
    return NextResponse.json(
      {
        ok: false,
        error: `Tool "${name}" is not a client-session tool`,
        code: "validation",
      },
      { status: 400 },
    );
  }

  const result = await executeClientSessionTool(name, input, executeOptions, "http");
  const status = result.ok
    ? 200
    : result.code === "requires_client_session"
      ? 503
      : toolExecuteHttpStatus(result.code);

  return NextResponse.json(result, { status });
}
