import { NextResponse } from "next/server";
import { edgeToolRegistry } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/adapters/execute";
import { createServerToolContext } from "@/lib/ai/adapters/http";
import {
  parseExecuteToolBody,
  toolExecuteHttpStatus,
} from "@/lib/ai/adapters/parseExecuteBody";
import { executeClientSessionTool } from "@/lib/ai/sessionBridgeExecute";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

  const result =
    tool.requiresClientSession === true
      ? await executeClientSessionTool(name, input, executeOptions, "http")
      : await executeTool(
          edgeToolRegistry,
          name,
          input,
          createServerToolContext(),
          executeOptions,
        );

  return NextResponse.json(result, { status: toolExecuteHttpStatus(result.ok ? undefined : result.code) });
}
