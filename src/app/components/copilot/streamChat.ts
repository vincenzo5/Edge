import type { AgentStreamEvent, ChatMessage } from "@/lib/ai/agent/contracts";
import { parseAgentStreamEvent } from "@/lib/ai/agent/contracts";

import type { PermissionMode } from "@/lib/ai/types";

export type StreamChatRequest = {
  messages: ChatMessage[];
  modelId?: string;
  threadId?: string;
  assistantMessageId?: string;
  workspaceSnapshot?: string;
  permissionMode?: PermissionMode;
};

export type StreamChatErrorKind =
  | "missing_key"
  | "http"
  | "network"
  | "parse"
  | "stream"
  | "aborted";

export type StreamChatError = {
  kind: StreamChatErrorKind;
  message: string;
  status?: number;
};

export type StreamChatResult =
  | { ok: true }
  | { ok: false; error: StreamChatError; aborted?: boolean };

/** Split NDJSON buffer into complete lines, returning remainder. */
export function splitNdjsonLines(buffer: string): { lines: string[]; remainder: string } {
  const parts = buffer.split("\n");
  const remainder = parts.pop() ?? "";
  const lines = parts.filter((line) => line.trim().length > 0);
  return { lines, remainder };
}

export function parseNdjsonEvent(line: string): AgentStreamEvent | null {
  try {
    return parseAgentStreamEvent(JSON.parse(line));
  } catch {
    return null;
  }
}

export async function streamChat(
  request: StreamChatRequest,
  options: {
    signal?: AbortSignal;
    onEvent: (event: AgentStreamEvent) => void;
    fetchFn?: typeof fetch;
  },
): Promise<StreamChatResult> {
  const fetchImpl = options.fetchFn ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        permissionMode: request.permissionMode ?? "write",
      }),
      signal: options.signal,
    });
  } catch (err) {
    if (options.signal?.aborted) {
      return {
        ok: false,
        aborted: true,
        error: { kind: "aborted", message: "Request cancelled" },
      };
    }
    const message = err instanceof Error ? err.message : "Network request failed";
    return { ok: false, error: { kind: "network", message } };
  }

  if (!response.ok) {
    if (response.status === 503) {
      let code: string | undefined;
      try {
        const body = (await response.json()) as { code?: string; error?: string };
        code = body.code;
        if (code === "missing_openrouter_key") {
          return {
            ok: false,
            error: {
              kind: "missing_key",
              message:
                "OpenRouter is not configured. Set OPENROUTER_API_KEY in .env.local and restart the dev server.",
              status: 503,
            },
          };
        }
      } catch {
        // fall through
      }
    }

    let message = `Chat request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    return {
      ok: false,
      error: { kind: "http", message, status: response.status },
    };
  }

  if (!response.body) {
    return {
      ok: false,
      error: { kind: "stream", message: "Response body is empty" },
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { lines, remainder } = splitNdjsonLines(buffer);
      buffer = remainder;

      for (const line of lines) {
        const event = parseNdjsonEvent(line);
        if (!event) {
          return {
            ok: false,
            error: { kind: "parse", message: "Invalid stream event" },
          };
        }
        options.onEvent(event);
      }
    }

    if (buffer.trim()) {
      const event = parseNdjsonEvent(buffer.trim());
      if (!event) {
        return {
          ok: false,
          error: { kind: "parse", message: "Invalid stream event" },
        };
      }
      options.onEvent(event);
    }

    return { ok: true };
  } catch (err) {
    if (options.signal?.aborted) {
      return {
        ok: false,
        aborted: true,
        error: { kind: "aborted", message: "Request cancelled" },
      };
    }
    const message = err instanceof Error ? err.message : "Stream read failed";
    return { ok: false, error: { kind: "stream", message } };
  }
}
