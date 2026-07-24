import type { ToolResult } from "../types";

const MAX_SUMMARY_CHARS = 500;

export function summarizeToolResult(toolName: string, result: ToolResult): string {
  if (!result.ok) {
    if (result.code === "confirmation_required") {
      return `${toolName}: awaiting your confirmation in chat`;
    }
    if (result.code === "requires_client_session") {
      return `${toolName}: requires live browser session — open Edge in your browser`;
    }
    const detail = result.error.slice(0, 200);
    return `${toolName} failed (${result.code ?? "error"}): ${detail}`;
  }

  const payload = JSON.stringify(result.data);
  const prefix = `${toolName} ok`;
  if (payload.length <= MAX_SUMMARY_CHARS - prefix.length - 2) {
    return `${prefix}: ${payload}`;
  }
  return `${prefix}: ${payload.slice(0, MAX_SUMMARY_CHARS - prefix.length - 3)}…`;
}

/** Full payload for model continuation messages (separate from client stream summaries). */
export function formatToolResultForModel(result: ToolResult): string {
  if (!result.ok) {
    return JSON.stringify({
      ok: false,
      error: result.error,
      code: result.code,
    });
  }

  const payloadRecord =
    result.data != null &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
      ? (result.data as Record<string, unknown>)
      : null;
  const meta =
    payloadRecord &&
    payloadRecord.meta != null &&
    typeof payloadRecord.meta === "object" &&
    !Array.isArray(payloadRecord.meta)
      ? payloadRecord.meta
      : undefined;

  const serialized = JSON.stringify(
    meta !== undefined ? { data: result.data, meta } : result.data,
  );
  const maxChars = 8000;
  if (serialized.length <= maxChars) return serialized;
  return `${serialized.slice(0, maxChars)}…`;
}
