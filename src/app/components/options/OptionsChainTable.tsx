"use client";

import { useVirtualizer, observeElementOffset, type Virtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, type RefObject } from "react";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import type { StrikeRow } from "@/lib/options/optionsClient";
import { EdgeEmptyState, EdgeSkeletonLine, EdgeStatusRegion } from "../design-system";
import OptionsChainRow from "./OptionsChainRow";

const ESTIMATED_ROW_HEIGHT = 28;
const VIRTUAL_OVERSCAN = 6;

function observeOptionsChainScrollRect<T extends Element>(
  instance: Virtualizer<T, Element>,
  cb: (rect: { width: number; height: number }) => void,
) {
  const element = instance.scrollElement;
  if (!element) {
    return () => {};
  }

  const notify = () => {
    const rect = element.getBoundingClientRect();
    cb({
      width: rect.width,
      height: rect.height,
    });
  };

  notify();
  const observer = new ResizeObserver(notify);
  observer.observe(element);
  return () => observer.disconnect();
}

function ChainLoadingState({
  symbol,
  expiration,
}: {
  symbol: string;
  expiration: string | null;
}) {
  const label = expiration
    ? `Loading ${symbol} ${expiration} options chain…`
    : `Loading ${symbol} options chain…`;

  return (
    <EdgeStatusRegion
      data-testid="options-chain-loading"
      label={label}
      description="Fetching strikes and quotes from market data…"
      variant="panel"
      spinnerSize="md"
    >
      <div className="w-full max-w-md space-y-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <EdgeSkeletonLine
            key={index}
            className="h-3"
            width={`${70 + (index % 3) * 10}%`}
          />
        ))}
      </div>
    </EdgeStatusRegion>
  );
}

export type OptionsChainTableProps = {
  contracts: StrikeRow[];
  spotPrice: number | null;
  chainMode: "atm" | "full";
  chainLoading: boolean;
  chainError: string | null;
  symbol: string;
  primaryExpiration: string | null;
  onLoadAllStrikes: () => void;
  onAnalyzeContract?: (contract: OptionContractSnapshot) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
};

export function OptionsChainTable({
  contracts,
  spotPrice,
  chainMode,
  chainLoading,
  chainError,
  symbol,
  primaryExpiration,
  onLoadAllStrikes,
  onAnalyzeContract,
  scrollRef: externalScrollRef,
}: OptionsChainTableProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;

  const rowVirtualizer = useVirtualizer({
    count: contracts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
    getItemKey: (index) => contracts[index]?.strike ?? index,
    observeElementRect: observeOptionsChainScrollRect,
    observeElementOffset,
  });

  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, contracts.length]);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const isVirtualized = virtualRows.length > 0;
  const paddingTop = isVirtualized && virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    isVirtualized && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  if (chainLoading) {
    return <ChainLoadingState symbol={symbol} expiration={primaryExpiration} />;
  }

  if (chainError) {
    return (
      <EdgeEmptyState
        data-testid="options-chain-error"
        message={chainError}
        role="alert"
        tone="error"
      />
    );
  }

  if (primaryExpiration && contracts.length === 0) {
    return <div className="text-[var(--edge-text-secondary)]">No contracts for this expiration.</div>;
  }

  if (contracts.length === 0) return null;

  const expiration = primaryExpiration ?? contracts[0]?.call?.expiration ?? contracts[0]?.put?.expiration ?? "";

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--edge-text-secondary)]">
          {chainMode === "atm" ? "ATM strikes" : "All strikes"}
        </span>
        {chainMode === "atm" && (
          <button
            type="button"
            data-testid="options-load-all-strikes"
            onClick={onLoadAllStrikes}
            className="rounded bg-[var(--edge-surface-toolbar)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]"
          >
            Load all strikes
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table
          data-testid="options-chain-table"
          className="w-full min-w-[420px] border-collapse text-[11px]"
        >
          <thead className="sticky top-0 z-[2] bg-[var(--edge-surface-panel)]">
            <tr className="text-[10px] text-[var(--edge-text-secondary)]">
              <th colSpan={3} className="border-b border-[var(--edge-border)] px-1 py-0.5 text-center font-semibold uppercase tracking-wide">
                Calls
              </th>
              <th className="border-x border-b border-[var(--edge-border)] px-1 py-0.5 text-center font-semibold uppercase tracking-wide">
                Strike
              </th>
              <th colSpan={3} className="border-b border-[var(--edge-border)] px-1 py-0.5 text-center font-semibold uppercase tracking-wide">
                Puts
              </th>
            </tr>
            <tr className="text-[10px] text-[var(--edge-text-secondary)]">
              <th className="px-1 py-1 text-left font-medium">Bid</th>
              <th className="px-1 py-1 text-left font-medium">Ask</th>
              <th className="px-1 py-1 text-left font-medium">Last</th>
              <th
                data-testid="options-chain-strike-header"
                className="min-w-[3rem] border-x border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-1 py-1 text-center font-medium"
              >
                Strike
              </th>
              <th className="px-1 py-1 text-left font-medium">Last</th>
              <th className="px-1 py-1 text-left font-medium">Ask</th>
              <th className="px-1 py-1 text-right font-medium">Bid</th>
            </tr>
          </thead>
          <tbody>
            {isVirtualized && paddingTop > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={7} style={{ height: paddingTop, padding: 0, border: 0 }} />
              </tr>
            ) : null}
            {isVirtualized
              ? virtualRows.map((virtualRow) => {
                  const row = contracts[virtualRow.index]!;
                  return (
                    <OptionsChainRow
                      key={row.strike}
                      row={row}
                      spotPrice={spotPrice}
                      expiration={expiration}
                      onAnalyzeContract={onAnalyzeContract}
                      measureRef={rowVirtualizer.measureElement}
                      virtualIndex={virtualRow.index}
                    />
                  );
                })
              : contracts.map((row, index) => (
                  <OptionsChainRow
                    key={row.strike}
                    row={row}
                    spotPrice={spotPrice}
                    expiration={expiration}
                    onAnalyzeContract={onAnalyzeContract}
                    virtualIndex={index}
                  />
                ))}
            {isVirtualized && paddingBottom > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={7} style={{ height: paddingBottom, padding: 0, border: 0 }} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
