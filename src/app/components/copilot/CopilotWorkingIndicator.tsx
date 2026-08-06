"use client";

import { useEffect, useState } from "react";

/** Ascending staircase heights (px) — short → tall like rising price bars. */
const BAR_HEIGHTS = [5, 8, 11, 14, 17] as const;
const BAR_WIDTH = 3;
const BAR_GAP = 1.5;
const CHART_HEIGHT = BAR_HEIGHTS[BAR_HEIGHTS.length - 1];
const CHART_WIDTH =
  BAR_HEIGHTS.length * BAR_WIDTH + (BAR_HEIGHTS.length - 1) * BAR_GAP;
/**
 * One phase = fill or empty of a single bar.
 * Cycle = fill₀ + 4 handoffs + empty₄ = 6 phases so the next bar
 * fills as the previous returns to transparent.
 */
const BAR_PHASE_S = 0.28;
const BAR_CYCLE_S = BAR_PHASE_S * (BAR_HEIGHTS.length + 1);

type Props = {
  /** Optional fixed start for deterministic tests. */
  startedAt?: number;
};

export function CopilotWorkingIndicator({ startedAt }: Props) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const origin = startedAt ?? Date.now();
    const tick = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - origin) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return (
    <span
      data-testid="copilot-working-indicator"
      className="copilot-working-indicator inline-flex items-center gap-2.5 text-[var(--edge-text-tertiary)]"
      aria-live="polite"
      aria-label={`Working for ${elapsedSec} seconds`}
    >
      <span
        className="copilot-working-bars shrink-0"
        data-testid="copilot-working-bars"
        style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}
        aria-hidden
      >
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={index}
            className="copilot-working-bar"
            style={{
              width: BAR_WIDTH,
              height,
              animationDuration: `${BAR_CYCLE_S}s`,
              animationDelay: `${index * BAR_PHASE_S}s`,
            }}
          />
        ))}
      </span>
      <span data-testid="copilot-working-label">Working for {elapsedSec}s</span>
    </span>
  );
}
