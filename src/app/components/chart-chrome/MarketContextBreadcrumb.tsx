"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MarketContext } from "@/lib/marketData/contracts/marketContext";
import type { Theme } from "@/lib/chartConfig";
import type { SymbolSelectResult } from "@/lib/watchlist/types";
import Tooltip from "../Tooltip";
import {
  buildContextDisplayModel,
  chipTooltipTitle,
  type ContextChip,
  type ContextDensity,
} from "./marketContextDisplay";

type Props = {
  symbol: string;
  theme: Theme;
  density: ContextDensity;
  onSymbolSelect: (result: SymbolSelectResult) => void;
};

const chipClass =
  "edge-focus-ring cursor-pointer shrink-0 rounded-[var(--edge-radius-xs)] border border-[var(--edge-border-subtle)] bg-transparent px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-[var(--edge-text-secondary)] hover:border-[var(--edge-border)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]";

const overflowTriggerClass =
  "edge-focus-ring shrink-0 rounded-[var(--edge-radius-xs)] border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]";

function ContextChipButton({
  chip,
  theme,
  onSelect,
}: {
  chip: ContextChip;
  theme: Theme;
  onSelect: (chip: ContextChip) => void;
}) {
  return (
    <Tooltip content={chipTooltipTitle(chip)} theme={theme} portaled>
      <button
        type="button"
        data-testid={chip.testId}
        onClick={() => onSelect(chip)}
        className={chipClass}
      >
        {chip.symbol}
      </button>
    </Tooltip>
  );
}

export default function MarketContextBreadcrumb({
  symbol,
  theme,
  density,
  onSymbolSelect,
}: Props) {
  const [context, setContext] = useState<MarketContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) {
      setContext(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/market-data/context?symbol=${encodeURIComponent(sym)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Market context request failed (${res.status})`);
        }
        return res.json() as Promise<{ context: MarketContext }>;
      })
      .then((body) => {
        if (!cancelled) {
          setContext(body.context);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setContext(null);
          setError(err instanceof Error ? err.message : "Failed to load market context");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    setOverflowOpen(false);
  }, [symbol, density, context]);

  useEffect(() => {
    if (!overflowOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [overflowOpen]);

  const display = useMemo(
    () => (context ? buildContextDisplayModel(context, density) : null),
    [context, density],
  );

  const navigateToChip = (chip: ContextChip) => {
    onSymbolSelect({
      symbol: chip.symbol,
      name: chip.tooltipName,
      exchange: context?.exchange ?? "",
    });
  };

  if (!symbol.trim()) return null;

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1.5"
      data-testid="market-context-breadcrumb"
    >
      {loading ? (
        <span
          data-testid="market-context-loading"
          className="rounded-[var(--edge-radius-sm)] bg-[var(--edge-surface-panel)] px-2 py-0.5 text-[10px] text-[var(--edge-text-muted)]"
        >
          Context…
        </span>
      ) : null}

      {!loading && display && (display.classification || display.chips.length > 0) ? (
        <>
          {display.classification ? (
            <span
              data-testid="market-context-classification"
              className="max-w-[240px] truncate text-[10px] font-medium text-[var(--edge-text-muted)]"
            >
              {display.classification}
            </span>
          ) : null}

          {display.chips.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {display.chips.map((chip) => (
                <ContextChipButton
                  key={chip.id}
                  chip={chip}
                  theme={theme}
                  onSelect={navigateToChip}
                />
              ))}

              {display.overflow.length > 0 ? (
                <div ref={overflowRef} className="relative">
                  <button
                    type="button"
                    data-testid="market-context-overflow-trigger"
                    className={overflowTriggerClass}
                    aria-expanded={overflowOpen}
                    onClick={() => setOverflowOpen((open) => !open)}
                  >
                    +{display.overflow.length}
                  </button>
                  {overflowOpen ? (
                    <div
                      data-testid="market-context-overflow-menu"
                      className="absolute left-0 top-full z-20 mt-1 flex min-w-[72px] flex-col gap-0.5 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-popover)] p-1 shadow-lg"
                    >
                      {display.overflow.map((chip) => (
                        <ContextChipButton
                          key={chip.id}
                          chip={chip}
                          theme={theme}
                          onSelect={(selected) => {
                            navigateToChip(selected);
                            setOverflowOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && error && !display?.classification && display?.chips.length === 0 ? (
        <span
          data-testid="market-context-error"
          className="text-[10px] text-[var(--edge-negative)]"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
