"use client";

import { memo, type RefObject } from "react";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  chainRowClass,
  chainRowSideClass,
  formatOptionLast,
  isLastOutsideSpread,
} from "@/lib/options/chainDisplay";
import { formatOptionPrice, type StrikeRow } from "@/lib/options/optionsClient";
import { ChainLegGreeksPopover } from "./ChainRowGreeksPopover";

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

type Props = {
  row: StrikeRow;
  spotPrice: number | null;
  expiration: string;
  onAnalyzeContract?: (contract: OptionContractSnapshot) => void;
  measureRef?: (node: Element | null) => void;
  virtualIndex?: number;
};

function optionsChainRowPropsAreEqual(prev: Props, next: Props): boolean {
  if (prev.virtualIndex !== next.virtualIndex) return false;
  if (prev.spotPrice !== next.spotPrice) return false;
  if (prev.expiration !== next.expiration) return false;
  if (prev.row.strike !== next.row.strike) return false;
  if (prev.onAnalyzeContract !== next.onAnalyzeContract) return false;
  return (
    prev.row.call?.last === next.row.call?.last &&
    prev.row.call?.bid === next.row.call?.bid &&
    prev.row.call?.ask === next.row.call?.ask &&
    prev.row.put?.last === next.row.put?.last &&
    prev.row.put?.bid === next.row.put?.bid &&
    prev.row.put?.ask === next.row.put?.ask
  );
}

function OptionsChainRow({
  row,
  spotPrice,
  expiration,
  onAnalyzeContract,
  measureRef,
  virtualIndex,
}: Props) {
  const callSide = chainRowSideClass(row.strike, spotPrice, "call");
  const putSide = chainRowSideClass(row.strike, spotPrice, "put");
  const rowBand = chainRowClass(row.strike, spotPrice);

  return (
    <tr
      ref={measureRef}
      data-index={virtualIndex}
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
        className={`min-w-[3rem] border-x border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-1 py-0.5 text-center text-[11px] font-semibold tabular-nums text-[var(--edge-text-strong)] ${rowBand ? "ring-1 ring-inset ring-[var(--edge-accent-blue)]/40" : ""}`}
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
}

export default memo(OptionsChainRow, optionsChainRowPropsAreEqual);

export type OptionsChainScrollRef = RefObject<HTMLDivElement | null>;
