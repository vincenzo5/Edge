"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccountOptional } from "@/app/components/AccountProvider";

type JournalSyncContextValue = {
  lastSyncedAt: number | null;
  syncing: boolean;
  syncNow: () => Promise<void>;
};

const JournalSyncContext = createContext<JournalSyncContextValue | null>(null);

/** Server-side broker ledger ingest is primary; client only triggers refresh. */
export function JournalSyncProvider({ children }: { children: ReactNode }) {
  const account = useAccountOptional();
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const lastTriggerRef = useRef(0);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/cron/brokerage-ingest", {
        method: "POST",
        cache: "no-store",
      });
      if (res.ok) {
        lastTriggerRef.current = Date.now();
        setLastSyncedAt(Date.now());
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void syncNow();
    const timer = window.setInterval(() => {
      void syncNow();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [syncNow]);

  const executionCount = account?.executions?.length ?? 0;
  useEffect(() => {
    if (executionCount === 0) return;
    void syncNow();
  }, [executionCount, syncNow]);

  const value = useMemo(
    () => ({ lastSyncedAt, syncing, syncNow }),
    [lastSyncedAt, syncing, syncNow],
  );

  return <JournalSyncContext.Provider value={value}>{children}</JournalSyncContext.Provider>;
}

export function useJournalSync(): JournalSyncContextValue {
  const ctx = useContext(JournalSyncContext);
  if (!ctx) {
    return {
      lastSyncedAt: null,
      syncing: false,
      syncNow: async () => {},
    };
  }
  return ctx;
}
