"use client";

import { useActiveChart } from "../../ActiveChartContext";

type Props = {
  onOpenFullChain?: () => void;
};

export function OptionsPanel({ onOpenFullChain }: Props) {
  const snapshot = useActiveChart();
  const symbol = snapshot?.config.symbol ?? null;

  if (!snapshot) {
    return (
      <div className="px-3 py-2 text-xs italic text-[var(--edge-text-secondary)]">
        Focus a chart to view options.
      </div>
    );
  }

  if (!symbol) {
    return (
      <div className="px-3 py-2 text-xs text-[var(--edge-text-secondary)]">
        Select a symbol to view options.
      </div>
    );
  }

  return (
    <div data-testid="options-panel" className="flex min-h-0 flex-1 flex-col text-xs">
      <div className="border-b border-[var(--edge-border)] px-3 py-2">
        <div className="mb-2 font-semibold text-[var(--edge-text-strong)]">{symbol} options</div>
        <p className="mb-2 text-[10px] text-[var(--edge-text-secondary)]">
          Open the full options chain in a floating panel above the chart.
        </p>
        {onOpenFullChain ? (
          <button
            type="button"
            data-testid="options-open-full-chain"
            onClick={onOpenFullChain}
            className="w-full rounded bg-[var(--edge-accent-blue)]/15 px-2 py-1.5 text-[10px] font-medium text-[var(--edge-accent-blue)] hover:bg-[var(--edge-accent-blue)]/25"
          >
            Open options chain
          </button>
        ) : null}
      </div>
    </div>
  );
}
