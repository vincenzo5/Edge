'use client';

import { useMemo, type ReactNode } from 'react';
import type { Candle, Interval, Theme } from '@edge/chart-core';
import { resolvePriceLegendLayout } from '../engine/priceLegendLayout';
import type { ChartSettings } from '../engine/chartSettings';
import PriceLegendLayout from './PriceLegendLayout';

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
  livePrice?: number | null;
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
  marketSessionLabel: _marketSessionLabel,
  livePrice = null,
  compact = false,
  contextSlot,
  leadingSlot,
}: Props) {
  void theme;

  const layout = useMemo(
    () =>
      resolvePriceLegendLayout({
        symbol,
        symbolName,
        exchange,
        interval,
        candles,
        dataIndex,
        chartSettings,
        livePrice,
        compact,
      }),
    [
      symbol,
      symbolName,
      exchange,
      interval,
      candles,
      dataIndex,
      chartSettings,
      livePrice,
      compact,
    ],
  );

  if (!layout) return null;

  return (
    <div
      className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)]"
      data-testid="chart-legend-bar"
    >
      <PriceLegendLayout
        layout={layout}
        leadingSlot={compact ? undefined : leadingSlot}
        contextSlot={!compact ? contextSlot : undefined}
        compact={compact}
      />
    </div>
  );
}
