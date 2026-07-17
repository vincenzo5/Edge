"use client";

import { useCallback, useEffect, useMemo } from "react";
import { isEditableTarget } from "@/lib/shortcuts/isEditableTarget";
import {
  advanceReview,
  getReviewSymbol,
  jumpToSymbol,
  startReview,
} from "@/lib/screener/reviewSession";
import type { ScreenerResultRow } from "@/lib/screener/types";
import { useScreenerState } from "./ScreenerProvider";
import { useScreenerReviewDrive } from "./useScreenerReviewDrive";
import { SCREENER_PAGE_SIZE } from "./ResultsTable";

type Options = {
  active: boolean;
  sortedRows: ScreenerResultRow[];
  hasRun: boolean;
  safePage: number;
  onPageChange: (page: number) => void;
};

export function useScreenerResultSelection({
  active,
  sortedRows,
  hasRun,
  safePage,
  onPageChange,
}: Options) {
  const { session, setSession } = useScreenerState();

  const selectedRow = useMemo(
    () => getReviewSymbol(sortedRows, session.reviewIndex),
    [sortedRows, session.reviewIndex],
  );

  useScreenerReviewDrive(selectedRow);

  useEffect(() => {
    if (!active || !hasRun || sortedRows.length === 0) return;
    if (!session.reviewActive) {
      setSession((prev) => startReview(prev));
    }
  }, [active, hasRun, sortedRows.length, session.reviewActive, setSession]);

  useEffect(() => {
    if (!active || sortedRows.length === 0) return;
    const targetPage = Math.floor(session.reviewIndex / SCREENER_PAGE_SIZE);
    if (targetPage !== safePage) {
      onPageChange(targetPage);
    }
  }, [active, session.reviewIndex, safePage, sortedRows.length, onPageChange]);

  const selectIndex = useCallback(
    (index: number) => {
      setSession((prev) => ({
        ...prev,
        reviewActive: true,
        reviewIndex: Math.max(0, Math.min(index, sortedRows.length - 1)),
      }));
    },
    [setSession, sortedRows.length],
  );

  const selectRow = useCallback(
    (row: ScreenerResultRow) => {
      setSession((prev) => jumpToSymbol(prev, sortedRows, row.symbol));
    },
    [setSession, sortedRows],
  );

  const moveSelection = useCallback(
    (delta: 1 | -1) => {
      setSession((prev) => advanceReview(prev, sortedRows, delta));
    },
    [setSession, sortedRows],
  );

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!hasRun || sortedRows.length === 0) return;

      const key = event.key.toLowerCase();

      if (event.key === "ArrowDown" || key === "j") {
        event.preventDefault();
        moveSelection(1);
        return;
      }

      if (event.key === "ArrowUp" || key === "k") {
        event.preventDefault();
        moveSelection(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, hasRun, moveSelection, sortedRows.length]);

  return {
    selectedRow,
    selectedIndex: session.reviewIndex,
    selectIndex,
    selectRow,
    moveSelection,
  };
}
