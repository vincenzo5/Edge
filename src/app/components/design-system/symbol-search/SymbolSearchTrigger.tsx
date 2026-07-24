"use client";

import { forwardRef } from "react";
import CompactSearchFieldShell, { compactSearchFieldClass } from "../CompactSearchFieldShell";
import { bodyTextClass } from "../styles";

type Props = {
  symbol: string;
  onOpen: () => void;
  "aria-label"?: string;
  "data-testid"?: string;
};

const SymbolSearchTrigger = forwardRef<HTMLButtonElement, Props>(function SymbolSearchTrigger(
  { symbol, onOpen, "aria-label": ariaLabel = "Search symbol", "data-testid": testId = "symbol-search-input" },
  ref,
) {
  const displaySymbol = symbol.trim();
  const labelClass = displaySymbol
    ? `${bodyTextClass()} text-[var(--edge-text-primary)]`
    : `${bodyTextClass()} text-[var(--edge-text-muted)]`;

  return (
    <CompactSearchFieldShell widthClass="min-w-[112px] w-auto">
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        data-testid={testId}
        className={compactSearchFieldClass(
          `${labelClass} h-7 !min-h-[28px] text-left outline-none hover:bg-[var(--edge-surface-hover)]`,
        )}
      >
        {displaySymbol || "Symbol"}
      </button>
    </CompactSearchFieldShell>
  );
});

export default SymbolSearchTrigger;
