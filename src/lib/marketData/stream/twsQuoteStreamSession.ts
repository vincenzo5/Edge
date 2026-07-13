import type { ChartQuoteStreamEvent, MarketQuote } from "@edge/chart-core";
import type { MarketDataService } from "../service/marketDataService";
import type { EquityQuote } from "../contracts/equities";
import { dataResultToResponseMeta } from "../contracts/result";
import { equityQuoteToMarketQuote, quoteSnapshotToMarketQuote } from "../validation/mappers";
import { getTwsStreamUrl } from "../providers/tws/client";
import type { QuoteStreamQueryInput } from "./streamQuerySchemas";
import type { StreamSession } from "./createStreamSession";
import {
  MAX_POLL_FAILURES_BEFORE_STALE,
  QUOTE_POLL_INTERVAL_MS,
} from "@/lib/chartDataFeed/pollStreamAdapter";

const TWS_STREAM_CONNECT_TIMEOUT_MS = 3_000;
const TWS_STREAM_FIRST_FRAME_TIMEOUT_MS = 5_000;

function normalizeChartMeta(
  partial: ReturnType<typeof dataResultToResponseMeta>,
): NonNullable<ChartQuoteStreamEvent extends { meta?: infer M } ? M : never> {
  return {
    source: partial.source,
    asOf: partial.asOf ?? Date.now(),
    stale: partial.stale,
    warnings: partial.warnings,
    streaming: true,
  };
}

function parseSsePayload(raw: string): ChartQuoteStreamEvent | null {
  try {
    return JSON.parse(raw) as ChartQuoteStreamEvent;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** TWS sidecar SSE quote stream with HTTP poll fallback. */
export function createTwsQuoteStreamSession(
  service: MarketDataService,
  query: QuoteStreamQueryInput,
): StreamSession {
  let stopped = false;
  let failureCount = 0;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let abortController: AbortController | undefined;
  let primed = false;
  let fillInFlight = false;
  let pollFallbackActive = false;

  const emitQuotes = (
    onEvent: (payload: string) => void,
    quotes: MarketQuote[],
    eventType: "snapshot" | "update",
    meta?: ReturnType<typeof normalizeChartMeta>,
  ) => {
    onEvent(
      JSON.stringify({
        type: eventType,
        quotes,
        meta: meta ?? {
          source: "tws",
          asOf: Date.now(),
          stale: false,
          streaming: true,
          warnings: [],
        },
      } satisfies ChartQuoteStreamEvent),
    );
  };

  const fillMissingQuotes = async (
    onEvent: (payload: string) => void,
    received: MarketQuote[],
  ) => {
    if (fillInFlight || stopped) return;
    const receivedSymbols = new Set(received.map((quote) => quote.symbol));
    const missing = query.symbols.filter((symbol) => !receivedSymbols.has(symbol));
    if (missing.length === 0) return;
    fillInFlight = true;
    try {
      const result = await service.getWatchlistQuotes(missing, {
        twsConnectionId: query.connectionId,
      });
      if (stopped || result.data.length === 0) return;
      const merged = new Map<string, MarketQuote>();
      for (const quote of received) {
        merged.set(quote.symbol, quote);
      }
      for (const quote of result.data) {
        merged.set(quote.symbol, quoteSnapshotToMarketQuote(quote));
      }
      const fillMeta = normalizeChartMeta(dataResultToResponseMeta(result));
      emitQuotes(onEvent, [...merged.values()], "update", fillMeta);
    } catch {
      // Best-effort fill-in; stream ticks or poll fallback may recover later.
    } finally {
      fillInFlight = false;
    }
  };

  const pollFallback = async (onEvent: (payload: string) => void, alreadyPrimed: boolean) => {
    if (stopped) return;
    try {
      const result = await service.getQuotes(query.symbols, {
        twsConnectionId: query.connectionId,
      });
      if (stopped) return;
      failureCount = 0;
      const meta = normalizeChartMeta(dataResultToResponseMeta(result));
      const quotes = result.data.map(equityQuoteToMarketQuote);
      onEvent(
        JSON.stringify(
          (alreadyPrimed
            ? { type: "update", quotes, meta }
            : { type: "snapshot", quotes, meta }) satisfies ChartQuoteStreamEvent,
        ),
      );
      primed = true;
    } catch (error) {
      if (stopped) return;
      failureCount += 1;
      const message = error instanceof Error ? error.message : "Quote stream poll failed";
      onEvent(
        JSON.stringify({
          type: "error",
          message,
          recoverable: true,
        } satisfies ChartQuoteStreamEvent),
      );
      if (failureCount >= MAX_POLL_FAILURES_BEFORE_STALE) {
        onEvent(
          JSON.stringify({
            type: "stale",
            reason: message,
            meta: {
              source: "mixed",
              asOf: Date.now(),
              stale: true,
              warnings: [message],
              streaming: true,
            },
          } satisfies ChartQuoteStreamEvent),
        );
      }
    }
  };

  const startPollFallback = (onEvent: (payload: string) => void) => {
    if (pollFallbackActive || stopped) return;
    pollFallbackActive = true;
    abortController?.abort();
    void pollFallback(onEvent, primed);
    pollTimer = setInterval(() => void pollFallback(onEvent, true), QUOTE_POLL_INTERVAL_MS);
  };

  return {
    start(onEvent) {
      const provider = service.getTwsProvider();
      const client = provider?.getClient?.() ?? null;
      if (!client) {
        startPollFallback(onEvent);
        return;
      }

      void (async () => {
        try {
          const config = client.getConfig();
          const url = getTwsStreamUrl(config.baseUrl, query.symbols, query.connectionId);
          abortController = new AbortController();
          const connectTimer = setTimeout(() => abortController?.abort(), TWS_STREAM_CONNECT_TIMEOUT_MS);
          const res = await fetch(url, {
            headers: { Accept: "text/event-stream" },
            signal: abortController.signal,
          });
          clearTimeout(connectTimer);
          if (!res.ok || !res.body) {
            throw new Error(`TWS stream failed (${res.status})`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          const firstFrameDeadline = Date.now() + TWS_STREAM_FIRST_FRAME_TIMEOUT_MS;

          while (!stopped) {
            if (!primed && Date.now() > firstFrameDeadline) {
              throw new Error("TWS stream first frame timeout");
            }

            const readPromise = reader.read();
            const remainingMs = Math.max(1, firstFrameDeadline - Date.now());
            const chunk = primed
              ? await readPromise
              : await Promise.race([
                  readPromise,
                  sleep(remainingMs).then(() => ({ done: true as const, value: undefined })),
                ]);

            if (chunk.done) {
              if (!primed) {
                throw new Error("TWS stream closed before first snapshot");
              }
              break;
            }

            buffer += decoder.decode(chunk.value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";
            for (const rawChunk of chunks) {
              const line = rawChunk
                .split("\n")
                .find((row) => row.startsWith("data: "));
              if (!line) continue;
              const event = parseSsePayload(line.slice(6));
              if (!event) continue;
              if (event.type === "snapshot" || event.type === "update") {
                const quotes = (event.quotes ?? []).map((q) => {
                  const row = q as MarketQuote & EquityQuote;
                  if ("price" in row && typeof row.price !== "undefined") {
                    return equityQuoteToMarketQuote({
                      symbol: row.symbol,
                      shortName: row.shortName,
                      exchange: row.exchange,
                      price: row.price ?? null,
                      change: row.change ?? null,
                      changePercent: row.changePercent ?? null,
                      volume: row.volume ?? null,
                      updatedAt: row.updatedAt ?? Date.now(),
                    });
                  }
                  return row as MarketQuote;
                });
                const eventType = !primed ? "snapshot" : "update";
                primed = true;
                emitQuotes(onEvent, quotes, eventType);
                if (eventType === "snapshot" && quotes.length < query.symbols.length) {
                  void fillMissingQuotes(onEvent, quotes);
                }
              } else if (event.type === "error") {
                const recoverable =
                  event.recoverable !== false &&
                  (event.message?.toLowerCase().includes("reconnect") ||
                    (event as { code?: string }).code === "reconnecting");
                onEvent(
                  JSON.stringify({
                    ...event,
                    recoverable,
                  } satisfies ChartQuoteStreamEvent),
                );
              } else {
                onEvent(JSON.stringify(event));
              }
            }
          }
        } catch {
          if (stopped) return;
          startPollFallback(onEvent);
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
