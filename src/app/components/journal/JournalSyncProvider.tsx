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
  ingestLedgerChanged,
  isDocumentVisible,
  JOURNAL_INGEST_POLL_BASE_MS,
  nextJournalIngestPollDelayMs,
  type BrokerageIngestClientResult,
} from "@/lib/journal/ingestPollSchedule";

type JournalSyncContextValue = {
  lastSyncedAt: number | null;
  syncing: boolean;
  syncNow: () => Promise<void>;
};

const JournalSyncContext = createContext<JournalSyncContextValue | null>(null);

type IngestResponse = {
  results?: BrokerageIngestClientResult[];
};

/** Server-side broker ledger ingest is primary; client only triggers refresh. */
export function JournalSyncProvider({ children }: { children: ReactNode }) {
  const account = useAccountOptional();
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const pollDelayRef = useRef(JOURNAL_INGEST_POLL_BASE_MS);
  const pollTimerRef = useRef<number | null>(null);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    let succeeded = false;
    try {
      const res = await fetch("/api/cron/brokerage-ingest", {
        method: "POST",
        cache: "no-store",
      });
      if (res.ok) {
        succeeded = true;
        const body = (await res.json().catch(() => ({}))) as IngestResponse;
        if (ingestLedgerChanged(body.results)) {
          setLastSyncedAt(Date.now());
        }
      }
    } finally {
      pollDelayRef.current = nextJournalIngestPollDelayMs(pollDelayRef.current, succeeded);
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const scheduleNextPoll = () => {
      if (cancelled) return;
      pollTimerRef.current = window.setTimeout(() => {
        void (async () => {
          if (cancelled) return;
          if (isDocumentVisible()) {
            await syncNow();
          }
          scheduleNextPoll();
        })();
      }, pollDelayRef.current);
    };

    void (async () => {
      await syncNow();
      scheduleNextPoll();
    })();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncNow();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (pollTimerRef.current != null) {
        window.clearTimeout(pollTimerRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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
