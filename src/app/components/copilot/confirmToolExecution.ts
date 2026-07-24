import { resolveConfirmExecuteOptions, applyAgentDrawingDefaults } from "@/lib/ai/agent/confirmGate";
import type { AgentDrawingLinkage } from "@/lib/ai/agent/confirmGate";
import type { ExecuteToolOptions, ToolResult } from "@/lib/ai/types";
import { summarizeToolResult } from "@/lib/ai/agent/summarizeToolResult";
import {
  bridgeSecretHeaders,
  readStoredBridgeCredentials,
} from "@/lib/ai/bridgeClientStorage";

export type ExecuteConfirmedToolOptions = {
  confirmationToken: string;
  requiresClientSession?: boolean;
  fetchFn?: typeof fetch;
  drawingLinkage?: AgentDrawingLinkage;
};

function withDrawingLinkageInput(
  toolName: string,
  input: unknown,
  linkage?: AgentDrawingLinkage,
): unknown {
  if (!linkage || typeof input !== "object" || input === null || Array.isArray(input)) {
    return input;
  }
  return applyAgentDrawingDefaults(
    toolName,
    input as Record<string, unknown>,
    linkage,
  );
}

export async function executeConfirmedTool(
  toolName: string,
  input: unknown,
  options: ExecuteConfirmedToolOptions,
): Promise<ToolResult> {
  if (!options.confirmationToken.trim()) {
    return {
      ok: false,
      error: "Missing confirmation token for confirmed tool execution",
      code: "confirmation_required",
    };
  }

  const execOptions = resolveConfirmExecuteOptions(
    toolName,
    undefined,
    options.confirmationToken,
  );
  const execInput = withDrawingLinkageInput(toolName, input, options.drawingLinkage);
  const fetchImpl = options.fetchFn ?? fetch;
  const endpoint = options.requiresClientSession
    ? "/api/ai/session/execute"
    : "/api/ai/tools/execute";

  const { bridgeSecret } = options.requiresClientSession
    ? readStoredBridgeCredentials()
    : { bridgeSecret: null };

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: bridgeSecretHeaders(bridgeSecret),
    body: JSON.stringify({
      name: toolName,
      input: execInput,
      permissionMode: execOptions.permissionMode,
      confirmationToken: execOptions.confirmationToken,
    }),
  });

  if (!response.ok) {
    let message = `Tool execution failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string; ok?: boolean };
      if (typeof payload.error === "string" && payload.error) {
        message = payload.error;
      } else if (payload.ok === false && "error" in payload && typeof payload.error === "string") {
        message = payload.error;
      }
    } catch {
      // ignore
    }
    return { ok: false, error: message, code: "execution" };
  }

  return (await response.json()) as ToolResult;
}

export function summarizeConfirmedToolResult(
  toolName: string,
  result: ToolResult,
): string {
  return summarizeToolResult(toolName, result);
}
