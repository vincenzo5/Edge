"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chromeConnectionFromHealth,
  type ShellBrokerConnectionChrome,
} from "@/lib/marketData/healthProjection";
import { shouldShowTwsRecovery, type ServerHealthPayload } from "@/lib/marketData/health";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";

const HEALTH_POLL_HEALTHY_MS = 30_000;
const HEALTH_POLL_DEGRADED_MS = 5_000;

const EMPTY_CHROME: ShellBrokerConnectionChrome = {
  chromeIncidentLabel: null,
  chromeRecoveryLabel: null,
  showRecovery: false,
};

export function useShellBrokerConnectionChrome(): ShellBrokerConnectionChrome {
  const { preference } = useDataConnectionPreference();
  const [health, setHealth] = useState<ServerHealthPayload | null>(null);
  const fetchGenerationRef = useRef(0);

  const refreshHealth = useCallback(async (): Promise<ServerHealthPayload | null> => {
    const generation = ++fetchGenerationRef.current;
    try {
      const res = await fetch("/api/market-data/health", { priority: "high" });
      if (!res.ok) return null;
      const payload = (await res.json()) as { health?: ServerHealthPayload };
      if (!payload.health) return null;
      if (generation === fetchGenerationRef.current) {
        setHealth(payload.health);
      }
      return payload.health;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      const nextHealth = await refreshHealth();
      if (cancelled) return;
      const twsProvider = nextHealth?.providers.find((provider) => provider.id === "tws");
      const pollMs = shouldShowTwsRecovery(twsProvider)
        ? HEALTH_POLL_DEGRADED_MS
        : HEALTH_POLL_HEALTHY_MS;
      timeoutId = window.setTimeout(() => {
        void poll();
      }, pollMs);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [refreshHealth]);

  return useMemo(
    () => (health ? chromeConnectionFromHealth(health, preference) : EMPTY_CHROME),
    [health, preference],
  );
}
