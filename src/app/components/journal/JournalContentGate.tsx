"use client";

import type { ReactNode } from "react";
import { EdgeButton, EdgeEmptyState } from "@/app/components/design-system";
import JournalGlobalEmptyState from "@/app/components/journal/JournalGlobalEmptyState";
import JournalPageLoadingSkeleton from "@/app/components/journal/JournalPageLoadingSkeleton";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import { journalDataPhase } from "@/lib/journal/journalDataPhase";

type Props = {
  variant: "dashboard" | "trades";
  onImported?: () => void;
  children: ReactNode;
};

export default function JournalContentGate({ variant, onImported, children }: Props) {
  const { loading, error, allTrades, retryLoadTrades } = useJournalTrades();
  const phase = journalDataPhase({
    loading,
    tradeCount: allTrades.length,
    error,
  });

  if (phase === "loading") {
    return <JournalPageLoadingSkeleton variant={variant} />;
  }

  if (phase === "empty") {
    return <JournalGlobalEmptyState onImported={onImported} />;
  }

  if (phase === "error") {
    return (
      <div data-testid="journal-content-error">
        <EdgeEmptyState
          message={error ?? "Could not load journal trades."}
          action={
            <EdgeButton variant="chrome" onClick={() => void retryLoadTrades()}>
              Retry
            </EdgeButton>
          }
        />
      </div>
    );
  }

  return children;
}
