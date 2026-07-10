"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { JournalFillResponse, JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { fetchJournalTrades, fetchJournalFills } from "@/lib/persistence/client/journalClient";
import { useJournalSync } from "@/app/components/journal/JournalSyncProvider";
import { useAccountOptional } from "@/app/components/AccountProvider";
import { filterTradesByAccount } from "@/lib/journal/filterTradesByAccount";

const LOAD_TRADES_ERROR_MESSAGE = "Could not load journal trades. Check your connection and try again.";

type JournalTradesContextValue = {
  loading: boolean;
  error: string | null;
  allTrades: JournalTradeResponse[];
  loadTrades: (background?: boolean) => Promise<void>;
  retryLoadTrades: () => Promise<void>;
  setAllTrades: Dispatch<SetStateAction<JournalTradeResponse[]>>;
};

const JournalTradesContext = createContext<JournalTradesContextValue | null>(null);

export function JournalTradesProvider({ children }: { children: ReactNode }) {
  const { lastSyncedAt } = useJournalSync();
  const account = useAccountOptional();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawTrades, setRawTrades] = useState<JournalTradeResponse[]>([]);
  const [fills, setFills] = useState<JournalFillResponse[]>([]);
  const hasTradesRef = useRef(false);

  hasTradesRef.current = rawTrades.length > 0;

  const allTrades = useMemo(
    () => filterTradesByAccount(rawTrades, fills, account?.activeTradingAccountId),
    [rawTrades, fills, account?.activeTradingAccountId],
  );

  const loadTrades = useCallback(async (background = false) => {
    if (!background && !hasTradesRef.current) {
      setLoading(true);
    }
    try {
      const [tradesResult, fillsResult] = await Promise.all([
        fetchJournalTrades(),
        fetchJournalFills(),
      ]);
      setRawTrades(tradesResult);
      setFills(fillsResult);
      setError(null);
    } catch {
      if (!hasTradesRef.current) {
        setError(LOAD_TRADES_ERROR_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLoadTrades = useCallback(async () => {
    setError(null);
    await loadTrades(false);
  }, [loadTrades]);

  useEffect(() => {
    void loadTrades(false);
  }, [loadTrades]);

  useEffect(() => {
    if (lastSyncedAt == null) return;
    void loadTrades(true);
  }, [lastSyncedAt, loadTrades]);

  const value = useMemo(
    () => ({
      loading,
      error,
      allTrades,
      loadTrades,
      retryLoadTrades,
      setAllTrades: setRawTrades,
    }),
    [loading, error, allTrades, loadTrades, retryLoadTrades],
  );

  return (
    <JournalTradesContext.Provider value={value}>{children}</JournalTradesContext.Provider>
  );
}

export function useJournalTrades(): JournalTradesContextValue {
  const ctx = useContext(JournalTradesContext);
  if (!ctx) {
    throw new Error("useJournalTrades must be used within JournalTradesProvider");
  }
  return ctx;
}
