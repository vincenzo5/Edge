"use client";

import { useEffect, useState } from "react";
import type { ServerHealthPayload } from "@/lib/marketData/health";

type SettingsHealthState = {
  health: ServerHealthPayload | null;
  loading: boolean;
  error: string | null;
};

export function useSettingsMarketDataHealth(enabled: boolean): SettingsHealthState {
  const [health, setHealth] = useState<ServerHealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    setLoading(true);

    void (async () => {
      try {
        const response = await fetch("/api/market-data/health", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Health fetch failed (${response.status})`);
        }
        const json = (await response.json()) as { health?: ServerHealthPayload };
        if (!json.health) {
          throw new Error("Health payload missing");
        }
        setHealth(json.health);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Could not load market data status.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [enabled]);

  return { health, loading, error };
}
