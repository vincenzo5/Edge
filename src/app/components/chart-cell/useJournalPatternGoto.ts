"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ChartHandle } from "../EdgeChart";

type Params = {
  chartRef: RefObject<ChartHandle | null>;
  isActive: boolean;
  candleCount: number;
  journalGotoMs: number | null;
  patternGotoMs: number | null;
  consumeJournalGoto: () => void;
  consumePatternGoto: () => void;
};

export function useJournalPatternGoto({
  chartRef,
  isActive,
  candleCount,
  journalGotoMs,
  patternGotoMs,
  consumeJournalGoto,
  consumePatternGoto,
}: Params) {
  const appliedJournalGotoRef = useRef<number | null>(null);
  const appliedPatternGotoRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || journalGotoMs == null || candleCount === 0) return;
    if (appliedJournalGotoRef.current === journalGotoMs) return;
    appliedJournalGotoRef.current = journalGotoMs;
    void chartRef.current?.goTo({ mode: "date", at: journalGotoMs });
    consumeJournalGoto();
  }, [isActive, journalGotoMs, candleCount, consumeJournalGoto, chartRef]);

  useEffect(() => {
    if (!isActive || patternGotoMs == null || candleCount === 0) return;
    if (appliedPatternGotoRef.current === patternGotoMs) return;
    appliedPatternGotoRef.current = patternGotoMs;
    void chartRef.current?.goTo({ mode: "date", at: patternGotoMs });
    consumePatternGoto();
  }, [isActive, patternGotoMs, candleCount, consumePatternGoto, chartRef]);
}
