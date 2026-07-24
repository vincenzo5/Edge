"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ScriptResultReadyEvent } from "@edge/chart-react";
import { fetchAlerts } from "@/lib/alerts/alertClient";
import { publishScriptAlertSnapshots } from "@/lib/alerts/scriptAlertSnapshot";

export function useScriptAlertSnapshotBridge(symbol: string): (
  event: ScriptResultReadyEvent,
) => void {
  const alertsRef = useRef<Awaited<ReturnType<typeof fetchAlerts>>>([]);
  const symbolRef = useRef(symbol.trim().toUpperCase());
  symbolRef.current = symbol.trim().toUpperCase();

  useEffect(() => {
    let cancelled = false;
    void fetchAlerts()
      .then((alerts) => {
        if (!cancelled) alertsRef.current = alerts;
      })
      .catch(() => {
        if (!cancelled) alertsRef.current = [];
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback((event: ScriptResultReadyEvent) => {
    const chartSymbol = symbolRef.current;
    if (!chartSymbol) return;
    const scriptId = event.instance.scriptId;
    const revision = event.instance.revision;
    if (!scriptId || !revision) return;

    void publishScriptAlertSnapshots({
      symbol: chartSymbol,
      scriptId,
      revision,
      manifest: event.manifest,
      series: event.series,
      candles: event.candles,
      alerts: alertsRef.current,
    });
  }, []);
}
