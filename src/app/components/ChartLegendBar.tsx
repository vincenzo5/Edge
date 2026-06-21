'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Candle, Interval, Theme } from '@/lib/chart/contracts';
import { formatChange, formatPrice, formatVolume } from '@/lib/chart/format';
import { resolveLegendBar } from '@/lib/chart/legend';
import { INTERVALS } from '@/lib/chartConfig';

type Props = {
  symbol: string;
  symbolName?: string;
  exchange?: string;
  interval: Interval;
  candles: Candle[];
  dataIndex: number | null;
  theme: Theme;
};

type SymbolMeta = { name: string; exchange: string };

export default function ChartLegendBar({
  symbol,
  symbolName,
  exchange,
  interval,
  candles,
  dataIndex,
  theme,
}: Props) {
  const [fetchedMeta, setFetchedMeta] = useState<SymbolMeta | null>(null);

  useEffect(() => {
    if (symbolName && exchange) {
      setFetchedMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: symbol }),
        });
        const body = await res.json();
        const match = (body.results ?? []).find(
          (r: { symbol: string }) => r.symbol.toUpperCase() === symbol.toUpperCase(),
        );
        if (!cancelled && match) {
          setFetchedMeta({ name: match.name, exchange: match.exchange });
        }
      } catch {
        /* keep symbol-only fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, symbolName, exchange]);

  const displayName = symbolName ?? fetchedMeta?.name ?? symbol;
  const displayExchange = exchange ?? fetchedMeta?.exchange ?? '';
  const intervalLabel =
    INTERVALS.find((i) => i.value === interval)?.label ?? interval.toUpperCase();

  const legend = useMemo(
    () => resolveLegendBar(candles, dataIndex),
    [candles, dataIndex],
  );

  if (!legend) return null;

  const { candle, change, changePct } = legend;
  const isUp = change >= 0;
  const isDark = theme === 'dark';

  const muted = isDark ? 'text-[#8B8FA3]' : 'text-gray-500';
  const ohlcv = isDark ? 'text-cyan-400' : 'text-cyan-600';
  const changeColor = isUp
    ? isDark
      ? 'text-[#00FF88]'
      : 'text-green-600'
    : isDark
      ? 'text-red-400'
      : 'text-red-600';

  const badgeLetter = (displayName || symbol).charAt(0).toUpperCase();

  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight"
      aria-label="Chart legend"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
          isDark ? 'bg-[#1E2030] text-[#E8E9ED]' : 'bg-gray-200 text-gray-700'
        }`}
      >
        {badgeLetter}
      </span>

      <span className={`shrink-0 font-medium ${muted}`}>
        {displayName}
        <span className="opacity-70"> · {intervalLabel}</span>
        {displayExchange ? (
          <span className="opacity-70"> · {displayExchange}</span>
        ) : null}
      </span>

      <span className={`flex flex-wrap items-center gap-x-2 font-mono tabular-nums ${ohlcv}`}>
        <span>O {formatPrice(candle.o)}</span>
        <span>H {formatPrice(candle.h)}</span>
        <span>L {formatPrice(candle.l)}</span>
        <span>C {formatPrice(candle.c)}</span>
        <span className={changeColor}>{formatChange(change, changePct)}</span>
        <span>V {formatVolume(candle.v)}</span>
      </span>
    </div>
  );
}
