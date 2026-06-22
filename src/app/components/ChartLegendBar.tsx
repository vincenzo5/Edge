'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Candle, Interval, Theme } from '@/lib/chart/contracts';
import type { ChartSettings } from '@/lib/chartConfig';
import { resolvePriceLegend } from '@/lib/chart/legend';
import PaneLegendBar from './PaneLegendBar';

type Props = {
  symbol: string;
  symbolName?: string;
  exchange?: string;
  interval: Interval;
  candles: Candle[];
  dataIndex: number | null;
  theme: Theme;
  chartSettings?: ChartSettings;
  onAction?: (actionId: string) => void;
  compact?: boolean;
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
  chartSettings,
  onAction,
  compact = false,
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

  const sections = useMemo(
    () =>
      resolvePriceLegend({
        symbol,
        symbolName: displayName,
        exchange: displayExchange,
        interval,
        candles,
        dataIndex,
        chartSettings,
      }),
    [symbol, displayName, displayExchange, interval, candles, dataIndex, chartSettings],
  );

  if (!sections) return null;

  return (
    <PaneLegendBar sections={sections} theme={theme} onAction={onAction} compact={compact} />
  );
}
