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
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import {
  fetchJournalFillAccountIndex,
  fetchJournalProviderTrades,
  invalidateJournalPersistenceCache,
} from "@/lib/persistence/client/journalClient";
import { useJournalSync } from "@/app/components/journal/JournalSyncProvider";
import { useAccountOptional } from "@/app/components/AccountProvider";
import { collectFillExecIds } from "@/lib/journal/journalProviderLoad";
import { JOURNAL_PROVIDER_TRADE_LIMIT } from "@/lib/journal/journalProviderConstants";
import { filterTradesByAccount } from "@/lib/journal/filterTradesByAccount";
import { ensureJournalPersistenceUserScope } from "@/lib/journal/ensureJournalPersistenceUserScope";

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
  const [fillAccountByExecId, setFillAccountByExecId] = useState<
    ReadonlyMap<string, string | null>
  >(() => new Map());
  const hasTradesRef = useRef(false);
  const previousAccountIdRef = useRef<string | null | undefined>(undefined);

  hasTradesRef.current = rawTrades.length > 0;

  const allTrades = useMemo(
    () => filterTradesByAccount(rawTrades, fillAccountByExecId, account?.activeTradingAccountId),
    [rawTrades, fillAccountByExecId, account?.activeTradingAccountId],
  );

  const loadTrades = useCallback(async (background = false) => {
    if (!background && !hasTradesRef.current) {
      setLoading(true);
    }
    try {
      await ensureJournalPersistenceUserScope();
      const tradesResult = await fetchJournalProviderTrades();
      const boundedTrades =
        tradesResult.length > JOURNAL_PROVIDER_TRADE_LIMIT
          ? tradesResult.slice(0, JOURNAL_PROVIDER_TRADE_LIMIT)
          : tradesResult;
      const accountIndex = await fetchJournalFillAccountIndex(collectFillExecIds(boundedTrades));
      setRawTrades(boundedTrades);
      setFillAccountByExecId(accountIndex);
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
    invalidateJournalPersistenceCache();
    void loadTrades(true);
  }, [lastSyncedAt, loadTrades]);

  useEffect(() => {
    const accountId = account?.activeTradingAccountId ?? null;
    if (previousAccountIdRef.current === undefined) {
      previousAccountIdRef.current = accountId;
      return;
    }
    if (previousAccountIdRef.current === accountId) return;
    previousAccountIdRef.current = accountId;
    void loadTrades(true);
  }, [account?.activeTradingAccountId, loadTrades]);

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
