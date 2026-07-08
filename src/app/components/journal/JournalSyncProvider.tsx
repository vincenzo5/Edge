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
import {
  mapExecutionsToJournalFills,
  syncExecutionsIntoFills,
} from "@/lib/journal/fillSync";
import { readLocalJournalSnapshot } from "@/lib/journal/localJournalStore";
import { upsertJournalFillsRemote } from "@/lib/persistence/client/journalClient";
import type { AccountExecution } from "@/lib/marketData/contracts/brokerage";

type JournalSyncContextValue = {
  lastSyncedAt: number | null;
  syncing: boolean;
  syncNow: () => Promise<void>;
};

const JournalSyncContext = createContext<JournalSyncContextValue | null>(null);

function executionFingerprint(executions: AccountExecution[]): string {
  const ids = executions
    .map((execution) => execution.execId?.trim())
    .filter((execId): execId is string => Boolean(execId))
    .sort();
  return ids.join("\0");
}

export function JournalSyncProvider({ children }: { children: ReactNode }) {
  const account = useAccountOptional();
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const lastFingerprintRef = useRef("");
  const accountExecutionsRef = useRef<AccountExecution[]>([]);

  accountExecutionsRef.current = account?.executions ?? [];

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      let executions = accountExecutionsRef.current;
      if (executions.length === 0) {
        const res = await fetch("/api/brokerage/trades", { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as { executions?: AccountExecution[] };
          executions = body.executions ?? [];
        }
      }
      if (executions.length === 0) {
        executions = accountExecutionsRef.current;
      }
      if (executions.length === 0) return;

      const fingerprint = executionFingerprint(executions);
      if (!fingerprint || fingerprint === lastFingerprintRef.current) return;

      const snapshot = readLocalJournalSnapshot();
      const { added } = syncExecutionsIntoFills(snapshot.fills, executions, "live");
      lastFingerprintRef.current = fingerprint;
      if (added === 0) return;

      const fills = mapExecutionsToJournalFills(executions, "live");
      if (fills.length === 0) return;
      await upsertJournalFillsRemote(fills, true);
      setLastSyncedAt(Date.now());
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

  const executionsFingerprint = executionFingerprint(account?.executions ?? []);
  useEffect(() => {
    if (!executionsFingerprint) return;
    if (executionsFingerprint === lastFingerprintRef.current) return;
    void syncNow();
  }, [executionsFingerprint, syncNow]);

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
