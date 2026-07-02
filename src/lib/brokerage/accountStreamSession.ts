import type { AccountStreamEvent } from "../marketData/contracts/brokerage";
import { AccountStreamEventSchema } from "../marketData/contracts/brokerage";
import { getBrokerageStreamUrl } from "./brokerageClient";

export type AccountStreamSession = {
  start: (onEvent: (payload: string) => void) => void;
  stop: () => void;
};

const POLL_INTERVAL_MS = 5_000;

function parseSsePayload(raw: string): AccountStreamEvent | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = AccountStreamEventSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** TWS sidecar SSE account stream with REST poll fallback. */
export function createAccountStreamSession(): AccountStreamSession {
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let abortController: AbortController | undefined;

  const pollFallback = async (onEvent: (payload: string) => void) => {
    if (stopped) return;
    try {
      const res = await fetch("/api/brokerage/snapshot", { cache: "no-store" });
      if (!res.ok) throw new Error(`Snapshot failed (${res.status})`);
      const payload = (await res.json()) as Record<string, unknown>;
      onEvent(
        JSON.stringify({
          type: "update",
          ...payload,
          meta: { source: "tws", asOf: Date.now(), streaming: false },
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Account poll failed";
      onEvent(JSON.stringify({ type: "error", message, recoverable: true }));
    }
  };

  return {
    start(onEvent) {
      void (async () => {
        try {
          const url = getBrokerageStreamUrl();
          abortController = new AbortController();
          const res = await fetch(url, {
            headers: { Accept: "text/event-stream" },
            signal: abortController.signal,
          });
          if (!res.ok || !res.body) {
            throw new Error(`Account stream failed (${res.status})`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!stopped) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";
            for (const chunk of chunks) {
              const line = chunk.split("\n").find((row) => row.startsWith("data: "));
              if (!line) continue;
              const event = parseSsePayload(line.slice(6));
              if (event) onEvent(JSON.stringify(event));
            }
          }
        } catch {
          if (stopped) return;
          void pollFallback(onEvent);
          pollTimer = setInterval(() => void pollFallback(onEvent), POLL_INTERVAL_MS);
        }
      })();
    },

    stop() {
      stopped = true;
      abortController?.abort();
      if (pollTimer) clearInterval(pollTimer);
    },
  };
}
