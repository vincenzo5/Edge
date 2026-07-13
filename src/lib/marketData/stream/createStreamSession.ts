import type {
  ChartCandleStreamEvent,
  ChartDataMeta,
  ChartQuoteStreamEvent,
  Candle,
  MarketQuote,
} from '@edge/chart-core';
import type { MarketDataService } from '../service/marketDataService';
import { dataResultToResponseMeta } from '../contracts/result';
import { equityQuoteToMarketQuote } from '../validation/mappers';
import { diffCandlesToStreamEvents } from '@/lib/chartDataFeed/streamDiff';
import {
  candlePollIntervalMs,
  MAX_POLL_FAILURES_BEFORE_STALE,
  QUOTE_POLL_INTERVAL_MS,
} from '@/lib/chartDataFeed/pollStreamAdapter';
import type { CandleStreamQueryInput, QuoteStreamQueryInput } from './streamQuerySchemas';
import { createIbkrSmdQuoteStreamSession } from './ibkrQuoteStreamSession';
import { createTwsQuoteStreamSession } from './twsQuoteStreamSession';

export type StreamSession = {
  start(onEvent: (payload: string) => void): void;
  stop(): void;
};

function normalizeChartMeta(partial: ReturnType<typeof dataResultToResponseMeta>): ChartDataMeta {
  return {
    source: partial.source,
    asOf: partial.asOf ?? Date.now(),
    stale: partial.stale,
    warnings: partial.warnings,
    streaming: true,
  };
}

export function createCandleStreamSession(
  service: MarketDataService,
  query: CandleStreamQueryInput,
): StreamSession {
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  let primed = false;
  let failureCount = 0;
  let lastCandles: Candle[] = [];

  const poll = async (onEvent: (payload: string) => void) => {
    if (stopped) return;
    try {
      const result = await service.getCandles({
        symbol: query.symbol,
        range: query.range,
        interval: query.interval,
      });
      if (stopped) return;
      failureCount = 0;

      const meta = normalizeChartMeta(dataResultToResponseMeta(result));
      const candles = result.data.candles;

      if (candles.length === 0) return;

      if (!primed) {
        lastCandles = candles;
        primed = true;
        return;
      }

      const events = diffCandlesToStreamEvents(lastCandles, candles, meta);
      for (const event of events) {
        if (event.type === 'replace-latest' || event.type === 'append') {
          lastCandles =
            event.type === 'replace-latest'
              ? lastCandles.map((bar, index, arr) =>
                  index === arr.length - 1 ? event.candle : bar,
                )
              : [...lastCandles, event.candle];
        } else if (event.type === 'snapshot') {
          lastCandles = event.candles;
        }
        onEvent(JSON.stringify(event satisfies ChartCandleStreamEvent));
      }

      if (meta.stale) {
        onEvent(
          JSON.stringify({
            type: 'stale',
            reason: 'provider marked data stale',
            meta,
          } satisfies ChartCandleStreamEvent),
        );
      }
    } catch (error) {
      if (stopped) return;
      failureCount += 1;
      const message = error instanceof Error ? error.message : 'Stream poll failed';
      onEvent(
        JSON.stringify({
          type: 'error',
          message,
          recoverable: true,
        } satisfies ChartCandleStreamEvent),
      );
      if (failureCount >= MAX_POLL_FAILURES_BEFORE_STALE) {
        onEvent(
          JSON.stringify({
            type: 'stale',
            reason: message,
            meta: {
              source: 'mixed',
              asOf: Date.now(),
              stale: true,
              warnings: [message],
              streaming: true,
            },
          } satisfies ChartCandleStreamEvent),
        );
      }
    }
  };

  return {
    start(onEvent) {
      const intervalMs = candlePollIntervalMs(query.interval);
      void poll(onEvent);
      timer = setInterval(() => {
        void poll(onEvent);
      }, intervalMs);
    },
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}

export function createQuoteStreamSession(
  service: MarketDataService,
  query: QuoteStreamQueryInput,
): Promise<StreamSession> {
  return resolveQuoteStreamSession(service, query);
}

export async function resolveQuoteStreamSession(
  service: MarketDataService,
  query: QuoteStreamQueryInput,
): Promise<StreamSession> {
  const transport = await service.resolveQuoteStreamTransport();
  if (transport === "tws") {
    return createTwsQuoteStreamSession(service, query);
  }
  if (transport === "ibkr") {
    return createIbkrSmdQuoteStreamSession(service, query);
  }
  return createPollQuoteStreamSession(service, query);
}

function createPollQuoteStreamSession(
  service: MarketDataService,
  query: QuoteStreamQueryInput,
): StreamSession {
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  let primed = false;
  let failureCount = 0;

  const poll = async (onEvent: (payload: string) => void) => {
    if (stopped) return;
    try {
      const result = await service.getQuotes(query.symbols, {
        twsConnectionId: query.connectionId,
      });
      if (stopped) return;
      failureCount = 0;

      const meta = normalizeChartMeta(dataResultToResponseMeta(result));
      const quotes = result.data.map(equityQuoteToMarketQuote);

      if (!primed) {
        primed = true;
        onEvent(
          JSON.stringify({
            type: 'snapshot',
            quotes,
            meta,
          } satisfies ChartQuoteStreamEvent),
        );
        return;
      }

      onEvent(
        JSON.stringify({
          type: 'update',
          quotes,
          meta,
        } satisfies ChartQuoteStreamEvent),
      );

      if (meta.stale) {
        onEvent(
          JSON.stringify({
            type: 'stale',
            reason: 'provider marked quotes stale',
            meta,
          } satisfies ChartQuoteStreamEvent),
        );
      }
    } catch (error) {
      if (stopped) return;
      failureCount += 1;
      const message = error instanceof Error ? error.message : 'Quote stream poll failed';
      onEvent(
        JSON.stringify({
          type: 'error',
          message,
          recoverable: true,
        } satisfies ChartQuoteStreamEvent),
      );
      if (failureCount >= MAX_POLL_FAILURES_BEFORE_STALE) {
        onEvent(
          JSON.stringify({
            type: 'stale',
            reason: message,
            meta: {
              source: 'mixed',
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
      void poll(onEvent);
      timer = setInterval(() => {
        void poll(onEvent);
      }, QUOTE_POLL_INTERVAL_MS);
    },
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}
