"use client";

import type { Theme } from "@/lib/chartConfig";
import ChartHeaderButton from "./ChartHeaderButton";

type Props = {
  theme: Theme;
  canBack?: boolean;
  canForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
};

/** Back/forward symbol-history arrows. */
export default function SymbolNavArrows({
  theme,
  canBack = false,
  canForward = false,
  onBack,
  onForward,
}: Props) {
  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      data-testid="symbol-nav-arrows"
    >
      <ChartHeaderButton
        theme={theme}
        iconOnly
        disabled={!canBack}
        title="Previous symbol"
        onClick={() => onBack?.()}
        data-testid="symbol-nav-back"
      >
        <span aria-hidden className="text-sm leading-none">
          ←
        </span>
      </ChartHeaderButton>
      <ChartHeaderButton
        theme={theme}
        iconOnly
        disabled={!canForward}
        title="Next symbol"
        onClick={() => onForward?.()}
        data-testid="symbol-nav-forward"
      >
        <span aria-hidden className="text-sm leading-none">
          →
        </span>
      </ChartHeaderButton>
    </div>
  );
}
