"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AlertsConfigPane, { type AlertDraft } from "@/app/components/alerts/AlertsConfigPane";
import AlertsLibraryRail from "@/app/components/alerts/AlertsLibraryRail";
import AlertsTileNav from "@/app/components/alerts/AlertsTileNav";
import ScreenerAlertsStrip from "@/app/components/alerts/ScreenerAlertsStrip";
import { useTileDensityOptional } from "@/app/components/app-workspace/TileDensityContext";
import { useAppWorkspace } from "@/app/components/app-workspace/AppWorkspaceContext";
import { fetchAlerts } from "@/lib/alerts/alertClient";
import type { AlertDefinitionResponse } from "@/lib/persistence/schemas/alerts";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

type Props = {
  tileId: string;
  surfaceState?: TileSurfaceState;
};

export default function AlertsTileSurface({ tileId, surfaceState }: Props) {
  const { document, updateWorkspaceTileSurfaceState } = useAppWorkspace();
  const density = useTileDensityOptional()?.mode ?? "standard";
  const [alerts, setAlerts] = useState<AlertDefinitionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<AlertDraft | null>(null);

  const selectedAlertId =
    document.tiles[tileId]?.surfaceState?.selectedAlertId ??
    surfaceState?.selectedAlertId ??
    null;

  const setSelectedAlertId = useCallback(
    (alertId: string | null) => {
      updateWorkspaceTileSurfaceState(tileId, {
        selectedAlertId: alertId || undefined,
      });
    },
    [tileId, updateWorkspaceTileSurfaceState],
  );

  useEffect(() => {
    const prefill = document.tiles[tileId]?.surfaceState?.alertPrefill ?? surfaceState?.alertPrefill;
    if (!prefill) return;
    setDraft(prefill);
    setSelectedAlertId(null);
  }, [document.tiles, surfaceState?.alertPrefill, tileId, setSelectedAlertId]);

  const refreshAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAlerts();
      setAlerts(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAlerts();
  }, [refreshAlerts]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AlertDraft>).detail;
      if (!detail?.symbol) return;
      if (detail.scriptId && detail.revision && detail.conditionId) {
        setDraft(detail);
        setSelectedAlertId(null);
        return;
      }
      if (detail.price == null) return;
      setDraft(detail);
      setSelectedAlertId(null);
    };
    window.addEventListener("edge:alert-prefill", handler as EventListener);
    return () => window.removeEventListener("edge:alert-prefill", handler as EventListener);
  }, [setSelectedAlertId]);

  const selectedAlert = useMemo(
    () => alerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [alerts, selectedAlertId],
  );

  const handleCreateAlert = useCallback(() => {
    setSelectedAlertId(null);
    setDraft({ symbol: "", operator: "cross_above", price: 0 });
  }, [setSelectedAlertId]);

  const handleSaved = useCallback(
    async (alert: AlertDefinitionResponse) => {
      await refreshAlerts();
      setSelectedAlertId(alert.id);
      setDraft(null);
    },
    [refreshAlerts, setSelectedAlertId],
  );

  const handleDeleted = useCallback(
    async (alertId: string) => {
      await refreshAlerts();
      if (selectedAlertId === alertId) setSelectedAlertId(null);
    },
    [refreshAlerts, selectedAlertId, setSelectedAlertId],
  );

  const stackLayout = density === "compact";

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      data-testid="alerts-tile-surface"
    >
      <AlertsTileNav onNewAlert={handleCreateAlert} />
      <ScreenerAlertsStrip />
      {loading ? (
        <p className="px-3 py-2 text-xs text-[var(--edge-text-secondary)]">Loading alerts…</p>
      ) : null}
      <div
        className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${
          stackLayout ? "flex-col" : "flex-row"
        }`}
      >
        <AlertsLibraryRail
          alerts={alerts}
          selectedAlertId={selectedAlertId}
          onSelectAlert={(alertId) => {
            setDraft(null);
            setSelectedAlertId(alertId || null);
          }}
          onCreateAlert={handleCreateAlert}
          stacked={stackLayout}
        />
        <AlertsConfigPane
          alert={selectedAlert}
          draft={draft}
          onSaved={(alert) => {
            void handleSaved(alert);
          }}
          onDeleted={(alertId) => {
            void handleDeleted(alertId);
          }}
        />
      </div>
    </div>
  );
}
