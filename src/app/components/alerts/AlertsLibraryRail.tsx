"use client";

import { useMemo, useState } from "react";

import { EdgeIconButton, EdgeSearchInput } from "@/app/components/design-system";
import { PlusIcon } from "@/app/components/chart-chrome/ChartHeaderIcons";
import { useWatchlistActions } from "@/app/components/watchlist/WatchlistContext";
import type { AlertDefinitionResponse } from "@/lib/persistence/schemas/alerts";
import { formatAlertLevelSummary } from "@/lib/alerts/evaluateAlerts";
import { drawingKindLabel } from "@/lib/alerts/drawingAlertGeometry";
import { tradePlanRoleLabel } from "@/lib/alerts/tradePlanAlerts";

type Props = {
  alerts: AlertDefinitionResponse[];
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string) => void;
  onCreateAlert: () => void;
  stacked?: boolean;
};

function statusLabel(status: AlertDefinitionResponse["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "triggered":
      return "Triggered";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export default function AlertsLibraryRail({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onCreateAlert,
  stacked = false,
}: Props) {
  const [query, setQuery] = useState("");
  const watchlist = useWatchlistActions();

  const watchlistNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of watchlist?.state.watchlists ?? []) {
      map.set(list.id, list.name);
    }
    return map;
  }, [watchlist?.state.watchlists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((alert) => {
      const watchlistName = alert.watchlistId
        ? watchlistNameById.get(alert.watchlistId)?.toLowerCase()
        : null;
      return (
        alert.symbol.toLowerCase().includes(q) ||
        watchlistName?.includes(q) ||
        alert.message?.toLowerCase().includes(q) ||
        formatAlertLevelSummary(alert).toLowerCase().includes(q) ||
        (alert.drawingKind ? drawingKindLabel(alert.drawingKind).toLowerCase().includes(q) : false) ||
        (alert.drawingRole ? tradePlanRoleLabel(alert.drawingRole).toLowerCase().includes(q) : false)
      );
    });
  }, [alerts, query, watchlistNameById]);

  return (
    <aside
      data-testid="alerts-library-rail"
      className={`flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] ${
        stacked
          ? "max-h-[40%] min-h-[8rem] border-b"
          : "w-[min(100%,14rem)] border-r lg:w-[14rem]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5 border-b border-[var(--edge-border-subtle)] px-2 py-2">
        <EdgeSearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search alerts"
          aria-label="Search alerts"
          density="compact"
          shellClassName="min-w-0 flex-1"
        />
        <EdgeIconButton
          type="button"
          aria-label="New alert"
          data-testid="alerts-library-new"
          className="shrink-0"
          onClick={onCreateAlert}
        >
          <PlusIcon size={16} />
        </EdgeIconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[var(--edge-text-secondary)]">No alerts yet.</p>
        ) : (
          filtered.map((alert) => {
            const selected = alert.id === selectedAlertId;
            const watchlistName = alert.watchlistId
              ? watchlistNameById.get(alert.watchlistId)
              : null;
            const title = watchlistName
              ? `${watchlistName} · watchlist`
              : alert.symbol;
            return (
              <button
                key={alert.id}
                type="button"
                data-testid={`alerts-library-item-${alert.id}`}
                className={`edge-focus-ring mb-1 flex w-full flex-col rounded-[var(--edge-radius-sm)] px-2 py-2 text-left ${
                  selected
                    ? "bg-[var(--edge-surface-hover)] text-[var(--edge-text-primary)]"
                    : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]"
                }`}
                onClick={() => onSelectAlert(alert.id)}
              >
                <span className="text-sm font-medium">{title}</span>
                <span className="text-xs">{formatAlertLevelSummary(alert)}</span>
                {alert.drawingKind ? (
                  <span className="text-[10px] text-[var(--edge-text-muted)]">
                    {drawingKindLabel(alert.drawingKind)}
                  </span>
                ) : null}
                {alert.drawingRole ? (
                  <span className="text-[10px] text-[var(--edge-text-muted)]">
                    Trade plan · {tradePlanRoleLabel(alert.drawingRole)}
                  </span>
                ) : null}
                <span className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                  {statusLabel(alert.status)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
