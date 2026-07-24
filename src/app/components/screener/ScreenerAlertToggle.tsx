"use client";

import { useCallback, useEffect, useState } from "react";

import { EdgeSelect } from "@/app/components/design-system";
import type { SavedScreen } from "@/lib/screener/types";
import {
  fetchScreenerAlerts,
  upsertScreenerAlertForScreen,
} from "@/lib/screener/screenerAlertClient";
import type { ScreenerAlertInterval } from "@/lib/persistence/schemas/screenerAlerts";

type Props = {
  screen: SavedScreen;
  compact?: boolean;
};

const intervalOptions = [
  { value: "15", label: "Every 15m" },
  { value: "60", label: "Every 60m" },
] as const;

export function ScreenerAlertToggle({ screen, compact = false }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState<ScreenerAlertInterval>(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const alerts = await fetchScreenerAlerts();
        if (cancelled) return;
        const alert = alerts.find((row) => row.screenId === screen.id && row.status === "active");
        setEnabled(Boolean(alert));
        setIntervalMinutes(alert?.intervalMinutes ?? 60);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screen.id]);

  const persist = useCallback(
    async (nextEnabled: boolean, nextInterval: ScreenerAlertInterval) => {
      setSaving(true);
      try {
        await upsertScreenerAlertForScreen({
          screenId: screen.id,
          enabled: nextEnabled,
          intervalMinutes: nextInterval,
        });
      } finally {
        setSaving(false);
      }
    },
    [screen.id],
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-1 ${compact ? "text-[10px]" : "text-xs"}`}
      data-testid={`screener-alert-toggle-${screen.id}`}
      onClick={(event) => event.stopPropagation()}
    >
      <label className="flex min-w-0 items-center gap-1 text-[var(--edge-text-secondary)]">
        <input
          type="checkbox"
          checked={enabled}
          disabled={loading || saving}
          data-testid={`screener-alert-enabled-${screen.id}`}
          onChange={(event) => {
            const nextEnabled = event.target.checked;
            setEnabled(nextEnabled);
            void persist(nextEnabled, intervalMinutes);
          }}
        />
        <span className="truncate">Notify</span>
      </label>
      {enabled ? (
        <EdgeSelect
          density="compact"
          aria-label={`Notify interval for ${screen.name}`}
          testId={`screener-alert-interval-${screen.id}`}
          value={String(intervalMinutes)}
          disabled={loading || saving}
          options={intervalOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(value) => {
            const nextInterval = value === "15" ? 15 : 60;
            setIntervalMinutes(nextInterval);
            void persist(true, nextInterval);
          }}
          className="min-w-0 flex-1"
        />
      ) : null}
    </div>
  );
}
