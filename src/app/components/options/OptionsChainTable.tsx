"use client";

import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  chainRowClass,
  chainRowSideClass,
  formatOptionLast,
  isLastOutsideSpread,
} from "@/lib/options/chainDisplay";
import { formatOptionPrice, type StrikeRow } from "@/lib/options/optionsClient";
import { ChainLegGreeksPopover } from "./ChainRowGreeksPopover";

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
    <div
      data-testid="options-chain-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)]/40 px-4 py-8"
    >
      <div
        data-testid="options-chain-loading-spinner"
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--edge-border)] border-t-[var(--edge-accent-blue)]"
        aria-hidden
      />
      <div className="text-center">
        <div className="text-xs font-medium text-[var(--edge-text-strong)]">{label}</div>
        <div className="mt-1 text-[10px] text-[var(--edge-text-secondary)]">
          Fetching strikes and quotes from market data…
        </div>
      </div>
      <div className="w-full max-w-md space-y-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-3 animate-pulse rounded bg-[var(--edge-bg-tertiary)]"
            style={{ width: `${70 + (index % 3) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function priceCellClass(sideClass: string): string {
  return [
    "px-1 py-0.5 text-[11px] tabular-nums text-[var(--edge-text-primary)]",
    sideClass,
  ].join(" ");
}

function lastCellClass(
  contract: OptionContractSnapshot | undefined,
  sideClass: string,
): string {
  const outside = isLastOutsideSpread(contract);
  return [
    "px-1 py-0.5 text-[11px] tabular-nums font-medium",
    sideClass,
    outside ? "text-[var(--edge-warning)]" : "text-[var(--edge-text-primary)]",
  ].join(" ");
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
}: OptionsChainTableProps) {
  if (chainLoading) {
    return <ChainLoadingState symbol={symbol} expiration={primaryExpiration} />;
  }

  if (chainError) {
    return (
      <div data-testid="options-chain-error" className="text-[var(--edge-negative)]" role="alert">
        {chainError}
      </div>
    );
  }

  if (primaryExpiration && contracts.length === 0) {
    return <div className="text-[var(--edge-text-secondary)]">No contracts for this expiration.</div>;
  }

  if (contracts.length === 0) return null;

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
            className="rounded bg-[var(--edge-bg-secondary)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)] hover:bg-[var(--edge-bg-tertiary)]"
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
                className="min-w-[3rem] border-x border-[var(--edge-border)] bg-[var(--edge-bg-secondary)] px-1 py-1 text-center font-medium"
              >
                Strike
              </th>
              <th className="px-1 py-1 text-left font-medium">Last</th>
              <th className="px-1 py-1 text-left font-medium">Ask</th>
              <th className="px-1 py-1 text-right font-medium">Bid</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((row) => {
              const callSide = chainRowSideClass(row.strike, spotPrice, "call");
              const putSide = chainRowSideClass(row.strike, spotPrice, "put");
              const rowBand = chainRowClass(row.strike, spotPrice);
              const expiration = primaryExpiration ?? row.call?.expiration ?? row.put?.expiration ?? "";

              return (
                <tr
                  key={row.strike}
                  data-testid={`options-chain-row-${row.strike}`}
                  className={`border-t border-[var(--edge-border)] ${rowBand}`}
                >
                  <ChainLegGreeksPopover
                    side="call"
                    strike={row.strike}
                    expiration={expiration}
                    spotPrice={spotPrice}
                    contract={row.call}
                    onAnalyzeContract={onAnalyzeContract}
                  >
                    <td className={priceCellClass(callSide)}>
                      {formatOptionPrice(row.call?.bid)}
                    </td>
                    <td className={priceCellClass(callSide)}>
                      {formatOptionPrice(row.call?.ask)}
                    </td>
                    <td className={lastCellClass(row.call, callSide)}>
                      {formatOptionLast(row.call?.last)}
                    </td>
                  </ChainLegGreeksPopover>
                  <td
                    data-testid={`options-chain-strike-${row.strike}`}
                    className={`min-w-[3rem] border-x border-[var(--edge-border)] bg-[var(--edge-bg-secondary)] px-1 py-0.5 text-center text-[11px] font-semibold tabular-nums text-[var(--edge-text-strong)] ${rowBand ? "ring-1 ring-inset ring-[var(--edge-accent-blue)]/40" : ""}`}
                  >
                    {row.strike}
                  </td>
                  <ChainLegGreeksPopover
                    side="put"
                    strike={row.strike}
                    expiration={expiration}
                    spotPrice={spotPrice}
                    contract={row.put}
                    onAnalyzeContract={onAnalyzeContract}
                  >
                    <td className={lastCellClass(row.put, putSide)}>
                      {formatOptionLast(row.put?.last)}
                    </td>
                    <td className={priceCellClass(putSide)}>
                      {formatOptionPrice(row.put?.ask)}
                    </td>
                    <td className={`${priceCellClass(putSide)} text-right`}>
                      {formatOptionPrice(row.put?.bid)}
                    </td>
                  </ChainLegGreeksPopover>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
