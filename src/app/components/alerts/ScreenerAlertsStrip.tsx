"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchScreenerAlerts } from "@/lib/screener/screenerAlertClient";
import type { ScreenerAlertDefinitionResponse } from "@/lib/persistence/schemas/screenerAlerts";
import { WORKSPACE_SURFACE_LINKS } from "@/lib/appWorkspace/deepLinks";

export default function ScreenerAlertsStrip() {
  const [alerts, setAlerts] = useState<ScreenerAlertDefinitionResponse[]>([]);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchScreenerAlerts();
      setAlerts(rows.filter((alert) => alert.status === "active"));
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (alerts.length === 0) return null;

  return (
    <div
      data-testid="alerts-screener-strip"
      className="border-b border-[var(--edge-border-subtle)] px-3 py-2"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--edge-text-secondary)]">Screener alerts</p>
        <Link
          href={WORKSPACE_SURFACE_LINKS.screener}
          className="text-[10px] text-[var(--edge-accent-blue)] hover:underline"
        >
          Open screener
        </Link>
      </div>
      <ul className="space-y-1">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="text-[10px] text-[var(--edge-text-muted)]"
            data-testid={`alerts-screener-item-${alert.id}`}
          >
            Screen {alert.screenId} · every {alert.intervalMinutes}m
          </li>
        ))}
      </ul>
    </div>
  );
}
