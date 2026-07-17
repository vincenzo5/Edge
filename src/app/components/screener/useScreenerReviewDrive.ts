"use client";

import { useEffect } from "react";
import type { ScreenerResultRow } from "@/lib/screener/types";
import { publishReviewSetSymbol } from "@/lib/screener/reviewChannel";
import { useOptionalWorkspaceDrive } from "@/app/components/app-workspace/WorkspaceDriveContext";

export function useScreenerReviewDrive(row: ScreenerResultRow | null): void {
  const workspaceDrive = useOptionalWorkspaceDrive();

  useEffect(() => {
    if (!row) return;
    const params = {
      symbol: row.symbol,
      name: row.name ?? undefined,
      exchange: row.exchange ?? undefined,
    };
    // Prefer in-process workspace drive when available. Also publishing on
    // BroadcastChannel would double-invoke loadSymbolIntoActiveChart and race
    // candle/viewport updates while keyboarding through screener results.
    if (workspaceDrive) {
      workspaceDrive.driveSymbol(params);
      return;
    }
    publishReviewSetSymbol(params.symbol, params.name, params.exchange);
  }, [row?.symbol, row?.name, row?.exchange, workspaceDrive]);
}
