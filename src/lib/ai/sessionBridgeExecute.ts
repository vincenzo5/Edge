import "server-only";

import { enqueueSessionExecution } from "./sessionBridgeStore";
import type { ExecuteToolOptions, ToolResult } from "./types";

export type SessionBridgeSource = "agent" | "mcp" | "http";

export type SessionBridgeLog = {
  ts: string;
  event: "session.bridge";
  tool: string;
  ok: boolean;
  code?: string;
  durationMs: number;
  source: SessionBridgeSource;
};

/** Structured stderr log for bridge debugging (no args/results/secrets). */
export function logSessionBridgeCall(
  entry: Omit<SessionBridgeLog, "ts" | "event">,
): void {
  const line: SessionBridgeLog = {
    ts: new Date().toISOString(),
    event: "session.bridge",
    ...entry,
  };
  if (line.ok) {
    delete line.code;
  }
  console.error(JSON.stringify(line));
}

export async function executeClientSessionTool(
  name: string,
  input: unknown,
  options: ExecuteToolOptions = {},
  source: SessionBridgeSource = "agent",
): Promise<ToolResult> {
  const t0 = Date.now();
  const permissionMode = options.permissionMode ?? "read";
  const resolved: ExecuteToolOptions = {
    permissionMode,
    confirmationToken: options.confirmationToken,
    confirmationValidatedByServer: options.confirmationValidatedByServer,
  };

  if (
    options.confirmationToken &&
    options.verifyConfirmationToken?.(
      options.confirmationToken,
      name,
      input,
      permissionMode,
    )
  ) {
    resolved.confirmationValidatedByServer = true;
  }

  const result = await enqueueSessionExecution(name, input, resolved);
  logSessionBridgeCall({
    tool: name,
    ok: result.ok,
    code: result.ok ? undefined : result.code,
    durationMs: Date.now() - t0,
    source,
  });
  return result;
}
