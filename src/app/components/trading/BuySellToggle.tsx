"use client";

import { bodyTextClass } from "../design-system/styles";

export type BuySellToggleProps = {
  side: "BUY" | "SELL";
  onChange: (side: "BUY" | "SELL") => void;
  lastPrice: number | null;
  formatLast?: (value: number) => string;
  testId?: string;
};

function defaultFormatLast(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BuySellToggle({
  side,
  onChange,
  lastPrice,
  formatLast = defaultFormatLast,
  testId = "trade-buy-sell-toggle",
}: BuySellToggleProps) {
  const lastLabel =
    lastPrice != null && Number.isFinite(lastPrice) ? formatLast(lastPrice) : "—";

  return (
    <div
      className="relative grid grid-cols-2 overflow-hidden rounded-md border border-[var(--edge-border)]"
      data-testid={testId}
    >
      <button
        type="button"
        className={`flex flex-col items-center px-2 py-2 motion-safe:transition-colors motion-safe:duration-[var(--edge-motion-fast)] motion-safe:ease ${
          side === "SELL"
            ? "bg-[var(--edge-negative)] text-white"
            : "bg-[var(--edge-surface-muted)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
        } ${bodyTextClass()}`}
        onClick={() => onChange("SELL")}
        data-testid="trade-side-sell"
        aria-pressed={side === "SELL"}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide">Sell</span>
        <span className="mt-0.5 font-mono text-sm">{lastLabel}</span>
      </button>
      <button
        type="button"
        className={`flex flex-col items-center px-2 py-2 motion-safe:transition-colors motion-safe:duration-[var(--edge-motion-fast)] motion-safe:ease ${
          side === "BUY"
            ? "bg-[var(--edge-positive)] text-white"
            : "bg-[var(--edge-surface-muted)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
        } ${bodyTextClass()}`}
        onClick={() => onChange("BUY")}
        data-testid="trade-side-buy"
        aria-pressed={side === "BUY"}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide">Buy</span>
        <span className="mt-0.5 font-mono text-sm">{lastLabel}</span>
      </button>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--edge-border-strong)] bg-[var(--edge-surface-panel)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--edge-text-strong)] shadow-[0_0_0_2px_var(--edge-surface-panel),0_1px_3px_rgba(0,0,0,0.35)]"
        data-testid="trade-last-price-pill"
      >
        {lastLabel}
      </div>
    </div>
  );
}
