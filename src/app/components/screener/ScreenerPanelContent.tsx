"use client";

import { useRef } from "react";
import { EdgeModalShell } from "../design-system";
import { PanelExpandButton, PanelPopOutButton } from "../sidebar/PanelChromeActions";
import {
  ScreenerScreensBody,
  ScreenerRunControls,
} from "./ScreenerScreensBody";
import { ScreenerResultsBody } from "./ScreenerResultsBody";

type Props = {
  active: boolean;
  variant: "modal" | "sidebar" | "floating";
  onClose?: () => void;
};

export function ScreenerPanelContent({ active, variant, onClose }: Props) {
  const layoutRootRef = useRef<HTMLDivElement>(null);

  const body = (
    <ScreenerScreensBody
      active={active}
      variant={variant}
      layoutRootRef={layoutRootRef}
      resultsSlot={
        <ScreenerResultsBody
          active={active}
          variant={variant}
          embedded
          onClose={onClose}
        />
      }
    />
  );

  if (variant === "sidebar") {
    if (!active) return null;
    return (
      <>
        <div className="shrink-0 border-b border-[var(--edge-border)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div
              className="text-xs font-semibold text-[var(--edge-text-strong)]"
              data-testid="screener-title"
            >
              Stock Screener
            </div>
            <div className="flex items-center gap-1">
              <PanelExpandButton />
              <PanelPopOutButton label="Pop out" />
            </div>
          </div>
        </div>
        {body}
      </>
    );
  }

  if (variant === "floating") {
    if (!active) return null;
    return (
      <>
        <div className="shrink-0 border-b border-[var(--edge-border)] px-3 py-2">
          <div
            className="text-xs font-semibold text-[var(--edge-text-strong)]"
            data-testid="screener-title"
          >
            Stock Screener
          </div>
        </div>
        {body}
      </>
    );
  }

  return (
    <EdgeModalShell
      open={active}
      title="Stock Screener"
      subtitle="Filter US equities and ETFs, then load symbols into the chart or watchlist."
      onClose={onClose ?? (() => {})}
      maxWidth="full"
      align="top"
      testId="screener-dialog"
      headerActions={<ScreenerRunControls active={active} />}
    >
      {body}
    </EdgeModalShell>
  );
}
