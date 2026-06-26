'use client';

import { useMemo } from 'react';
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
  onAction?: (actionId: string) => void;
  compact?: boolean;
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
  onAction,
  compact = false,
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
    <PaneLegendBar sections={sections} theme={theme} onAction={onAction} compact={compact} />
  );
}
