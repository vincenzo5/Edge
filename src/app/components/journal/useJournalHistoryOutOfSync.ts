"use client";

import { useMemo } from "react";
import { useAccountOptional } from "@/app/components/AccountProvider";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import { reconcileJournalOpensWithPositions } from "@/lib/journal/reconcileJournalOpens";

/** True when journal open trades do not match live IB positions for the active account. */
export function useJournalHistoryOutOfSync(): boolean {
  const account = useAccountOptional();
  const { allTrades } = useJournalTrades();

  const openTrades = useMemo(
    () => allTrades.filter((trade) => trade.status === "open"),
    [allTrades],
  );

  const livePositionsForAccount = useMemo(() => {
    const accountId = account?.activeTradingAccountId?.trim();
    const positions = account?.positions ?? [];
    if (!accountId) return positions;
    return positions.filter((row) => (row.account?.trim() ?? "") === accountId);
  }, [account?.activeTradingAccountId, account?.positions]);

  return useMemo(() => {
    if (!account?.activeTradingAccountId) return false;
    const reconcile = reconcileJournalOpensWithPositions(
      openTrades,
      livePositionsForAccount,
      account.activeTradingAccountId,
    );
    return !reconcile.inSync;
  }, [account?.activeTradingAccountId, livePositionsForAccount, openTrades]);
}
