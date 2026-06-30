'use client';

import { useMemo, type ReactNode } from 'react';
import type { Candle, Interval, Theme } from '@edge/chart-core';
import { resolvePriceLegend } from '../engine/legend';
import type { ChartSettings } from '../engine/chartSettings';
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
  marketSessionLabel?: string | null;
  onAction?: (actionId: string) => void;
  compact?: boolean;
  /** Optional second-line content below the OHLCV legend (e.g. market context breadcrumb). */
  contextSlot?: ReactNode;
  /** Optional content rendered before the OHLCV sections on the top legend line. */
  leadingSlot?: ReactNode;
};

export default function ChartLegendBar({
  symbol,
  symbolName,
  exchange,
  interval,
  candles,
  dataIndex,
  theme,
  chartSettings,
  marketSessionLabel,
  onAction,
  compact = false,
  contextSlot,
  leadingSlot,
}: Props) {
  const displayName = symbolName ?? symbol;
  const displayExchange = exchange ?? '';

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
    <div className="relative">
      {marketSessionLabel && chartSettings?.statusLine?.showMarketStatus !== false ? (
        <span className="pointer-events-none absolute right-2 top-0 z-10 rounded-[var(--edge-radius-xs)] bg-[var(--edge-surface-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--edge-text-muted)]">
          {marketSessionLabel}
        </span>
      ) : null}
      <PaneLegendBar sections={sections} theme={theme} onAction={onAction} compact={compact} leading={compact ? undefined : leadingSlot} />
      {!compact && contextSlot ? (
        <div className="pointer-events-none absolute left-2 top-[36px] z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1 [&>*]:pointer-events-auto">
          {contextSlot}
        </div>
      ) : null}
    </div>
  );
}
