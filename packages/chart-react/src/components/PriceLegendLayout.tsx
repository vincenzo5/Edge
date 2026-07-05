'use client';

import type { ReactNode } from 'react';
import type { PriceLegendLayout as PriceLegendLayoutModel } from '../engine/priceLegendLayout';

type Props = {
  layout: PriceLegendLayoutModel;
  leadingSlot?: ReactNode;
  contextSlot?: ReactNode;
  compact?: boolean;
};

function OhlcCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="text-[11px] font-medium text-[var(--edge-text-muted)]">{label}</span>
      <span
        data-testid={`price-legend-value-${label}`}
        className="font-mono tabular-nums text-[11px]"
        style={{ color: valueColor }}
      >
        {value}
      </span>
    </span>
  );
}

export default function PriceLegendLayout({
  layout,
  leadingSlot,
  contextSlot,
  compact = false,
}: Props) {
  return (
    <div
      className={`group/pane-legend flex max-w-full flex-col gap-1 rounded-[var(--edge-radius-sm)] px-1.5 py-0.5 transition-colors group-hover/pane-legend:bg-[var(--edge-surface-panel)]/90 group-hover/pane-legend:backdrop-blur-[2px] ${
        compact ? 'min-w-0 flex-nowrap' : ''
      }`}
      aria-label="Price legend"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        {leadingSlot ? <div className="flex shrink-0 items-center">{leadingSlot}</div> : null}

        {layout.identity ? (
          <div className="group/legend-identity relative min-w-0 shrink-0">
            <div
              className="flex min-w-0 items-center gap-1"
              data-testid="price-legend-identity-trigger"
            >
              {layout.identity.letter ? (
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--edge-surface-active)] text-[10px] font-medium text-[var(--edge-text-strong)]"
                  title="Ticker symbol"
                >
                  {layout.identity.letter}
                </span>
              ) : null}
              <span className="truncate text-[13px] font-semibold text-[var(--edge-text-strong)]">
                {layout.identity.title}
              </span>
            </div>
            {contextSlot ? (
              <div
                data-testid="price-legend-context-slot"
                className="absolute left-0 top-full z-10 hidden max-w-[min(100vw,420px)] flex-wrap items-center gap-1 pt-0.5 group-hover/legend-identity:flex group-focus-within/legend-identity:flex"
              >
                {contextSlot}
              </div>
            ) : null}
          </div>
        ) : null}

        {layout.ohlc ? (
          <div
            data-testid="price-legend-ohlc-group"
            className="flex shrink-0 items-center gap-x-1.5"
          >
            <OhlcCell label="O" value={layout.ohlc.open} valueColor={layout.valueColor} />
            <OhlcCell label="H" value={layout.ohlc.high} valueColor={layout.valueColor} />
            <OhlcCell label="L" value={layout.ohlc.low} valueColor={layout.valueColor} />
            <OhlcCell label="C" value={layout.ohlc.close} valueColor={layout.valueColor} />
            {layout.change ? (
              <span
                data-testid="price-legend-change"
                className="font-mono tabular-nums text-[11px]"
                style={{ color: layout.valueColor }}
              >
                {layout.change}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
