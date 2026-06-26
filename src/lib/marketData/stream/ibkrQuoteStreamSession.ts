import type { ChartQuoteStreamEvent, MarketQuote } from "@edge/chart-core";
import type { MarketDataService } from "../service/marketDataService";
import type { EquityQuote } from "../contracts/equities";
import { dataResultToResponseMeta } from "../contracts/result";
import { equityQuoteToWatchlistQuote } from "../validation/mappers";
import {
  getSharedIbkrSmdSession,
  smdUpdatesToQuotes,
} from "../providers/ibkr/smdSession";
import type { QuoteStreamQueryInput } from "./streamQuerySchemas";
import type { StreamSession } from "./createStreamSession";
import {
  MAX_POLL_FAILURES_BEFORE_STALE,
  QUOTE_POLL_INTERVAL_MS,
} from "@/lib/chartDataFeed/pollStreamAdapter";

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

/** IBKR smd-backed quote stream with HTTP batch fallback on disconnect. */
export function createIbkrSmdQuoteStreamSession(
  service: MarketDataService,
  query: QuoteStreamQueryInput,
): StreamSession {
  let stopped = false;
  let failureCount = 0;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let unsubscribeSmd: (() => void) | undefined;
  let smdSession: ReturnType<typeof getSharedIbkrSmdSession> | null = null;
  const quoteState = new Map<string, EquityQuote>();

  const pollFallback = async (onEvent: (payload: string) => void, primed: boolean) => {
    if (stopped) return;
    try {
      const result = await service.getWatchlistQuotes(query.symbols);
      if (stopped) return;
      failureCount = 0;
      const meta = normalizeChartMeta(dataResultToResponseMeta(result));
      const quotes = result.data as MarketQuote[];
      onEvent(
        JSON.stringify(
          (primed
            ? { type: "update", quotes, meta }
            : { type: "snapshot", quotes, meta }) satisfies ChartQuoteStreamEvent,
        ),
      );
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

  return {
    start(onEvent) {
      let primed = false;
      const provider = service.getIbkrProvider();
      const client = provider?.getClient?.() ?? null;

      void (async () => {
        if (!client || !provider) {
          await pollFallback(onEvent, false);
          primed = true;
          pollTimer = setInterval(() => void pollFallback(onEvent, true), QUOTE_POLL_INTERVAL_MS);
          return;
        }

        try {
          const batch = await provider.getQuotesBatch(query.symbols);
          for (const quote of batch.quotes) {
            quoteState.set(quote.symbol, quote);
          }
          if (batch.missingSymbols.length > 0) {
            const fill = await service.getWatchlistQuotes(batch.missingSymbols);
            for (const row of fill.data) {
              quoteState.set(row.symbol, {
                symbol: row.symbol,
                shortName: row.shortName,
                exchange: row.exchange,
                price: row.regularMarketPrice,
                change: row.regularMarketChange,
                changePercent: row.regularMarketChangePercent,
                volume: row.regularMarketVolume,
                updatedAt: row.updatedAt ?? Date.now(),
              });
            }
          }

          const snapshotQuotes = query.symbols
            .map((sym) => quoteState.get(sym))
            .filter((q): q is NonNullable<typeof q> => q != null)
            .map((q) => equityQuoteToWatchlistQuote(q) as MarketQuote);

          onEvent(
            JSON.stringify({
              type: "snapshot",
              quotes: snapshotQuotes,
              meta: {
                source: "ibkr",
                asOf: Date.now(),
                stale: false,
                streaming: true,
              },
            } satisfies ChartQuoteStreamEvent),
          );
          primed = true;

          smdSession = getSharedIbkrSmdSession(client);
          await smdSession.subscribe(query.symbols);

          unsubscribeSmd = smdSession.onUpdate((updates) => {
            if (stopped || !primed) return;
            smdUpdatesToQuotes(updates, quoteState);
            const quotes = query.symbols
              .map((sym) => quoteState.get(sym))
              .filter((q): q is NonNullable<typeof q> => q != null)
              .map((q) => equityQuoteToWatchlistQuote(q) as MarketQuote);
            onEvent(
              JSON.stringify({
                type: "update",
                quotes,
                meta: {
                  source: "ibkr",
                  asOf: Date.now(),
                  stale: false,
                  streaming: true,
                },
              } satisfies ChartQuoteStreamEvent),
            );
          });
        } catch {
          await pollFallback(onEvent, false);
          primed = true;
          pollTimer = setInterval(() => void pollFallback(onEvent, true), QUOTE_POLL_INTERVAL_MS);
        }
      })();
    },

    stop() {
      stopped = true;
      if (pollTimer) clearInterval(pollTimer);
      unsubscribeSmd?.();
      smdSession?.unsubscribe(query.symbols);
    },
  };
}
