import type {
  Candle,
  ChartDataFeed,
  ScriptSeriesContext,
  ScriptSeriesRequest,
  ScriptSeriesResolver,
} from '@edge/chart-core';
import { dedupeScriptSeriesKeys, parseScriptSeriesKey, serializeScriptSeriesKey } from '@edge/chart-core';

export function createChartScriptSeriesResolver(feed: ChartDataFeed): ScriptSeriesResolver {
  return async (
    requests: ScriptSeriesRequest[],
    context: ScriptSeriesContext,
    signal?: AbortSignal,
  ): Promise<Map<string, Candle[]>> => {
    const keys = dedupeScriptSeriesKeys(
      requests.map((request) => serializeScriptSeriesKey(request, context)),
    );
    const result = new Map<string, Candle[]>();

    for (const key of keys) {
      const parsed = parseScriptSeriesKey(key);
      const page = await feed.loadCandles({
        symbol: parsed.symbol,
        interval: parsed.interval,
        range: context.range,
        sessionMode: context.sessionMode ?? 'regular',
        signal,
      });
      result.set(key, page.candles);
    }

    return result;
  };
}
