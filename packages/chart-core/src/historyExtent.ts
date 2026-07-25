import type { Candle } from './contracts';
import type { ChartHistoryExtent, ChartHistoryExtentCompleteness } from './dataSource';

/** Merge page/provider extent with session state; `fromMs` only moves earlier. */
export function mergeChartHistoryExtent(
  prev: ChartHistoryExtent | null | undefined,
  page: ChartHistoryExtent | null | undefined,
  candles: Pick<Candle, 't'>[],
  hasMoreOlder: boolean,
): ChartHistoryExtent | null {
  if (!prev && !page && candles.length === 0) return null;

  const first = candles[0]?.t;
  const last = candles.at(-1)?.t;
  let fromMs = prev?.fromMs ?? page?.fromMs ?? first ?? 0;
  let toMs = prev?.toMs ?? page?.toMs ?? last ?? Date.now();

  if (first != null) fromMs = Math.min(fromMs, first);
  if (last != null) toMs = Math.max(toMs, last);
  if (page?.fromMs != null) fromMs = Math.min(fromMs, page.fromMs);
  if (page?.toMs != null) toMs = Math.max(toMs, page.toMs);

  const completeness: ChartHistoryExtentCompleteness =
    !hasMoreOlder && (page?.completeness === 'exact' || prev?.completeness === 'exact')
      ? 'exact'
      : 'discovered';

  return { fromMs, toMs, completeness };
}

/** Resolve visible window timestamps from fractional viewport indices. */
export function visibleWindowMs(
  candles: Pick<Candle, 't'>[],
  startIndex: number,
  endIndex: number,
): { fromMs: number; toMs: number } | null {
  if (candles.length === 0) return null;
  const start = Math.max(0, Math.min(candles.length - 1, Math.floor(startIndex)));
  const end = Math.max(0, Math.min(candles.length - 1, Math.ceil(endIndex) - 1));
  const fromMs = candles[start]?.t;
  const toMs = candles[end]?.t;
  if (fromMs == null || toMs == null) return null;
  return { fromMs, toMs: Math.max(fromMs, toMs) };
}
