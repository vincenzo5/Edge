"use client";

import { useEffect, useRef } from "react";
import { clearEphemeralMarketDataCaches } from "@/lib/marketData/cache/clearEphemeralMarketDataCaches";
import { clearLocalJournalSnapshot } from "@/lib/journal/localJournalStore";
import { invalidateJournalPersistenceCache } from "@/lib/persistence/client/persistenceClientCache";
import { clearActiveTradingAccount } from "@/lib/trading/activeAccount";

type DevSessionStatus = {
  persistenceEnabled?: boolean;
  configuredDevEmail?: string | null;
  user?: { email?: string | null } | null;
};

/** Re-bootstrap dev session when EDGE_DEV_USER_EMAIL changed but the cookie still targets another user. */
export function DevSessionAligner() {
  const realignAttemptedRef = useRef(false);

  useEffect(() => {
    if (realignAttemptedRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/dev-session", { cache: "no-store" });
        if (!response.ok || cancelled) return;

        const body = (await response.json()) as DevSessionStatus;
        if (!body.persistenceEnabled) return;

        const configured = body.configuredDevEmail?.trim().toLowerCase() ?? "";
        const current = body.user?.email?.trim().toLowerCase() ?? "";
        if (!configured || !current || configured === current) return;

        realignAttemptedRef.current = true;

        await fetch("/api/auth/dev-session", { method: "DELETE" });
        clearEphemeralMarketDataCaches();
        invalidateJournalPersistenceCache();
        clearLocalJournalSnapshot();
        clearActiveTradingAccount();

        const bootstrap = await fetch("/api/auth/dev-session", { cache: "no-store" });
        if (!bootstrap.ok || cancelled) return;

        window.location.reload();
      } catch {
        /* ignore alignment errors */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
