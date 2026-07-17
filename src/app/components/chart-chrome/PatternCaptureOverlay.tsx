"use client";

import type { PatternSection } from "@/lib/patternLibrary/types";
import { SECTION_BAND_COLORS } from "@/lib/patternLibrary/renderChart";
import { barBandStyle, type CaptureViewport } from "@/lib/patternCapture/slice";
import type { PriceScaleSide } from "@/lib/chart/layout";
import type { CaptureAnchor, CapturePhase } from "@/lib/patternCapture/fsm";

type Props = {
  sections: PatternSection[];
  pendingStart: CaptureAnchor | null;
  pendingEnd: CaptureAnchor | null;
  hoverBarIndex: number | null;
  visibleRange: CaptureViewport | null;
  phase: CapturePhase;
  clickDots: CaptureAnchor[];
  priceScaleSide?: PriceScaleSide;
};

export default function PatternCaptureOverlay({
  sections,
  pendingStart,
  pendingEnd,
  hoverBarIndex,
  visibleRange,
  phase,
  clickDots,
  priceScaleSide = "right",
}: Props) {
  const band =
    visibleRange != null
      ? (fromBar: number, toBar: number) => barBandStyle(fromBar, toBar, visibleRange, priceScaleSide)
      : null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[30]"
      data-testid="pattern-capture-overlay"
      aria-hidden
    >
      {visibleRange && band
        ? sections.map((section, index) => {
            const style = band(section.fromBar, section.toBar);
            return (
              <div
                key={section.id}
                className="absolute top-0 bottom-8 bg-[var(--edge-accent)]/8"
                style={{
                  ...style,
                  backgroundColor: SECTION_BAND_COLORS[index % SECTION_BAND_COLORS.length],
                }}
              >
                <span className="absolute left-1 top-1 rounded bg-[var(--edge-surface-elevated)]/90 px-1.5 py-0.5 text-[10px] text-[var(--edge-text-primary)]">
                  {section.label}
                </span>
              </div>
            );
          })
        : null}

      {visibleRange && band && phase === "labeling" && pendingStart && pendingEnd ? (
        <div
          className="absolute top-0 bottom-8 bg-[var(--edge-accent)]/12"
          style={band(pendingStart.barIndex, pendingEnd.barIndex)}
        />
      ) : null}

      {visibleRange &&
      band &&
      phase === "capturing" &&
      pendingStart != null &&
      hoverBarIndex != null &&
      hoverBarIndex >= pendingStart.barIndex ? (
        <div
          className="absolute top-0 bottom-8 bg-[var(--edge-accent)]/8"
          style={band(pendingStart.barIndex, hoverBarIndex)}
        />
      ) : null}

      {clickDots.map((anchor, index) => (
        <div
          key={`dot-${index}-${anchor.barIndex}-${anchor.timestamp}`}
          className="absolute z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[var(--edge-surface-elevated)] bg-[var(--edge-accent)]"
          style={{ left: `${anchor.markerLeftPct}%`, top: anchor.markerTopPx }}
          data-testid="pattern-capture-click-dot"
        />
      ))}
    </div>
  );
}
