"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CellConfig } from "@/lib/chartConfig";
import type { SymbolSelectResult } from "@/lib/watchlist/types";

type CellHistory = {
  entries: SymbolSelectResult[];
  index: number;
};

const EMPTY_HISTORY: CellHistory = { entries: [], index: -1 };

export type SymbolNavigationHistoryInput = {
  cells: CellConfig[];
  activeCellIndex: number;
  hydrated: boolean;
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function sameSymbol(a: SymbolSelectResult, b: SymbolSelectResult): boolean {
  return normalizeSymbol(a.symbol) === normalizeSymbol(b.symbol);
}

function cellToResult(cell: CellConfig): SymbolSelectResult {
  return {
    symbol: cell.symbol,
    name: cell.symbolName ?? cell.symbol,
    exchange: cell.exchange ?? "",
  };
}

function pushEntry(
  histories: Map<number, CellHistory>,
  cellIndex: number,
  result: SymbolSelectResult,
): void {
  const current = histories.get(cellIndex) ?? { entries: [], index: -1 };
  const cursorEntry = current.entries[current.index];
  if (cursorEntry && sameSymbol(cursorEntry, result)) return;

  const truncated = current.entries.slice(0, current.index + 1);
  truncated.push(result);
  histories.set(cellIndex, {
    entries: truncated,
    index: truncated.length - 1,
  });
}

export function useSymbolNavigationHistory({
  cells,
  activeCellIndex,
  hydrated,
}: SymbolNavigationHistoryInput) {
  const historiesRef = useRef<Map<number, CellHistory>>(new Map());
  const lastSeenRef = useRef<Map<number, string>>(new Map());
  const pendingHistoryNavRef = useRef<{ cellIndex: number; symbol: string } | null>(
    null,
  );
  const [, bump] = useState(0);

  const refresh = useCallback(() => {
    bump((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let changed = false;

    cells.forEach((cell, cellIndex) => {
      const normalized = normalizeSymbol(cell.symbol);
      if (!normalized) return;

      const pendingNav = pendingHistoryNavRef.current;
      if (pendingNav?.cellIndex === cellIndex && pendingNav.symbol === normalized) {
        pendingHistoryNavRef.current = null;
        lastSeenRef.current.set(cellIndex, normalized);
        return;
      }

      const lastSeen = lastSeenRef.current.get(cellIndex);
      if (lastSeen === normalized) return;

      const history = historiesRef.current.get(cellIndex) ?? EMPTY_HISTORY;
      const cursorEntry = history.entries[history.index];
      const result = cellToResult(cell);

      if (cursorEntry && sameSymbol(cursorEntry, result)) {
        lastSeenRef.current.set(cellIndex, normalized);
        return;
      }

      pushEntry(historiesRef.current, cellIndex, result);
      lastSeenRef.current.set(cellIndex, normalized);
      changed = true;
    });

    if (changed) refresh();
  }, [cells, hydrated, refresh]);

  const activeHistory =
    historiesRef.current.get(activeCellIndex) ?? EMPTY_HISTORY;

  const navigate = useCallback(
    (
      cellIndex: number,
      direction: "back" | "forward",
    ): SymbolSelectResult | null => {
      const current = historiesRef.current.get(cellIndex);
      if (!current || current.entries.length === 0) return null;

      const nextIndex =
        direction === "back" ? current.index - 1 : current.index + 1;
      if (nextIndex < 0 || nextIndex >= current.entries.length) return null;

      const target = current.entries[nextIndex];
      if (!target) return null;

      pendingHistoryNavRef.current = {
        cellIndex,
        symbol: normalizeSymbol(target.symbol),
      };

      historiesRef.current.set(cellIndex, {
        entries: current.entries,
        index: nextIndex,
      });
      refresh();
      return current.entries[nextIndex] ?? null;
    },
    [refresh],
  );

  const canBack = activeHistory.index > 0;
  const canForward =
    activeHistory.index >= 0 &&
    activeHistory.index < activeHistory.entries.length - 1;

  return useMemo(
    () => ({
      navigate,
      canBack,
      canForward,
    }),
    [navigate, canBack, canForward],
  );
}
