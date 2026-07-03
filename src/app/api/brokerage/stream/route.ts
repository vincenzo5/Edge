import {
  BrokerageRequestError,
  getBrokerageStreamUrl,
  probeSidecarLiveness,
} from "@/lib/brokerage/brokerageClient";
import { brokerageDisabledResponse, brokerageErrorResponse } from "@/lib/brokerage/routeHelpers";
import { isBrokerageConfigured } from "@/lib/brokerage/brokerageService";
import { awaitSidecarForBrokerage } from "@/lib/marketData/providers/tws/startup";

export const runtime = "nodejs";

/** Proxy TWS sidecar account SSE stream to the browser. */
export async function GET(request: Request): Promise<Response> {
  if (!isBrokerageConfigured()) return brokerageDisabledResponse();

  await awaitSidecarForBrokerage();

  // Fast-fail when the sidecar is unresponsive. Without this, the proxy holds
  // a route handler + socket open for the full sidecar timeout (often minutes)
  // on every EventSource reconnect, starving the dev server.
  const live = await probeSidecarLiveness(undefined, 2_000);
  if (!live) {
    return brokerageErrorResponse(
      new BrokerageRequestError(
        "sidecar_unreachable",
        "TWS sidecar did not respond to /status within 2s. Stream not opened.",
      ),
    );
  }

  const url = getBrokerageStreamUrl();
  const signal = request.signal;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let stopped = false;
      const abort = () => {
        stopped = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      signal.addEventListener("abort", abort);

      try {
        const res = await fetch(url, {
          headers: { Accept: "text/event-stream" },
          signal,
        });
        if (!res.ok || !res.body) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: `Stream failed (${res.status})`, recoverable: true })}\n\n`,
            ),
          );
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (error) {
        if (!stopped) {
          const message = error instanceof Error ? error.message : "Account stream failed";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message, recoverable: true })}\n\n`,
            ),
          );
        }
      } finally {
        abort();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
