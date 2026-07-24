"use client";

import { useMemo } from "react";
import type { DataProviderId } from "@/lib/connections/types";
import {
  canDisableProvider,
  moveProviderInOrder,
  toggleProviderDisabled,
  WATERFALL_PREFERENCE_PROVIDER_IDS,
} from "@/lib/marketData/providerWaterfall";
import { useDataProviderPreference } from "@/lib/marketData/useDataProviderPreference";
import { listActiveProviders } from "@/lib/marketData/state/capabilities";
import type { ServerHealthPayload } from "@/lib/marketData/health";
import { EdgeIconButton, EdgeToggleSwitch } from "../design-system";
import { annotationTextClass } from "../design-system/styles";
import { providerStatusLabel, connectionStatusTone } from "./connectionStatusLabel";

type Props = {
  enabled: boolean;
  health: ServerHealthPayload | null;
  healthLoading: boolean;
  healthError: string | null;
};

const PROVIDER_LABELS: Record<DataProviderId, string> = {
  tws: "IB Gateway (TWS)",
  ibkr: "IBKR Client Portal",
  yahoo: "Yahoo Finance",
  massive: "Massive",
  fmp: "FMP",
  fred: "FRED",
  sec: "SEC",
};

function formatCapabilities(capabilities: readonly string[]): string {
  if (capabilities.length <= 3) {
    return capabilities.join(", ");
  }
  return `${capabilities.slice(0, 3).join(", ")} +${capabilities.length - 3}`;
}

function statusTextClass(tone: ReturnType<typeof connectionStatusTone>): string {
  switch (tone) {
    case "positive":
      return "text-[var(--edge-positive)]";
    case "warning":
      return "text-[var(--edge-warning)]";
    case "negative":
      return "text-[var(--edge-negative)]";
    default:
      return "text-[var(--edge-text-muted)]";
  }
}

function isProviderConfiguredForPrefs(
  providerId: DataProviderId,
  configured: ReadonlySet<DataProviderId>,
): boolean {
  if (providerId === "yahoo") return true;
  return configured.has(providerId);
}

export default function MarketDataSettingsSection({
  enabled,
  health,
  healthLoading,
  healthError,
}: Props) {
  const { preference, setPreference } = useDataProviderPreference();

  const configuredProviders = useMemo(() => {
    const configured = new Set<DataProviderId>(["yahoo"]);
    for (const row of health?.providers ?? []) {
      if (row.configured) configured.add(row.id as DataProviderId);
    }
    return configured;
  }, [health?.providers]);

  const providerRows = useMemo(() => {
    const healthById = new Map((health?.providers ?? []).map((row) => [row.id, row]));
    return listActiveProviders().map((definition) => {
      const live = healthById.get(definition.provider);
      const status = live?.status ?? "disabled";
      return {
        id: definition.provider,
        label: live?.label ?? PROVIDER_LABELS[definition.provider] ?? definition.provider.toUpperCase(),
        configured: live?.configured ?? false,
        status,
        detail: live?.detail ?? "Not configured",
        capabilities: formatCapabilities(definition.capabilities),
        envGate: definition.envGate,
      };
    });
  }, [health?.providers]);

  const preferenceRows = useMemo(() => {
    return preference.orderedProviders
      .filter((id) => WATERFALL_PREFERENCE_PROVIDER_IDS.includes(id))
      .map((id) => ({
        id,
        label: PROVIDER_LABELS[id] ?? id.toUpperCase(),
        configured: isProviderConfiguredForPrefs(id, configuredProviders),
        disabled: preference.disabledProviders.includes(id),
        canDisable: canDisableProvider({
          providerId: id,
          preference,
          configured: configuredProviders,
          capability: "equity_candles",
        }),
      }));
  }, [configuredProviders, preference]);

  if (!enabled) return null;

  return (
    <section
      className="space-y-4"
      aria-labelledby="app-settings-market-data-heading"
      data-testid="app-settings-market-data-section"
    >
      <div className="space-y-1">
        <h3
          id="app-settings-market-data-heading"
          className="text-sm font-semibold text-[var(--edge-text-strong)]"
        >
          Market data
        </h3>
        <p className="text-xs text-[var(--edge-text-secondary)]">
          Platform providers and their configured status. Configured means the server has the required
          environment variables; healthy means recent delivery succeeded.
        </p>
        <p className="text-xs text-[var(--edge-text-muted)]">
          Display preference order affects charts, watchlist quotes, and options only. Trading still
          requires broker-backed quotes. API keys stay in server environment for now (see{" "}
          <code className="text-[var(--edge-text-secondary)]">.env.example</code>).
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[var(--edge-text-strong)]">Display provider order</h4>
        <p className="text-xs text-[var(--edge-text-muted)]">
          Reorder or disable configured providers for display datasets. At least one provider must
          remain enabled.
        </p>
        <ul
          className="space-y-2 rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] p-2"
          data-testid="app-settings-provider-preference-list"
        >
          {preferenceRows.map((row, index) => {
            const disableBlocked = !row.disabled && !row.canDisable;
            return (
              <li
                key={row.id}
                className="flex items-center gap-2 rounded-[var(--edge-radius-sm)] px-2 py-1.5"
                data-testid={`app-settings-provider-preference-${row.id}`}
              >
                <div className="flex shrink-0 flex-col gap-0.5">
                  <EdgeIconButton
                    aria-label={`Move ${row.label} up`}
                    size="compact"
                    disabled={index === 0 || !row.configured}
                    onClick={() =>
                      setPreference({
                        ...preference,
                        orderedProviders: moveProviderInOrder(
                          preference.orderedProviders,
                          row.id,
                          "up",
                        ),
                      })
                    }
                  >
                    ↑
                  </EdgeIconButton>
                  <EdgeIconButton
                    aria-label={`Move ${row.label} down`}
                    size="compact"
                    disabled={index === preferenceRows.length - 1 || !row.configured}
                    onClick={() =>
                      setPreference({
                        ...preference,
                        orderedProviders: moveProviderInOrder(
                          preference.orderedProviders,
                          row.id,
                          "down",
                        ),
                      })
                    }
                  >
                    ↓
                  </EdgeIconButton>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-[var(--edge-text-strong)]">{row.label}</div>
                  <div className="text-[11px] text-[var(--edge-text-muted)]">
                    {row.configured ? "Configured" : "Not configured"}
                    {disableBlocked ? " · keep at least one enabled" : ""}
                  </div>
                </div>
                <EdgeToggleSwitch
                  aria-label={`${row.disabled ? "Enable" : "Disable"} ${row.label} for display`}
                  checked={!row.disabled}
                  disabled={!row.configured || disableBlocked}
                  onChange={(checked: boolean) =>
                    setPreference(toggleProviderDisabled(preference, row.id, !checked))
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>

      {healthLoading ? (
        <p className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}>
          Loading provider status…
        </p>
      ) : healthError ? (
        <p
          role="alert"
          className={`${annotationTextClass()} text-[var(--edge-negative)]`}
          data-testid="app-settings-market-data-health-error"
        >
          {healthError}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--edge-radius-md)] border border-[var(--edge-border)]">
          <table
            className="w-full min-w-[28rem] border-collapse text-left text-xs"
            data-testid="app-settings-provider-table"
          >
            <thead>
              <tr className="border-b border-[var(--edge-border)] bg-[var(--edge-surface-panel)]">
                <th className="px-3 py-2 font-medium text-[var(--edge-text-secondary)]">Provider</th>
                <th className="px-3 py-2 font-medium text-[var(--edge-text-secondary)]">Configured</th>
                <th className="px-3 py-2 font-medium text-[var(--edge-text-secondary)]">Status</th>
                <th className="px-3 py-2 font-medium text-[var(--edge-text-secondary)]">Capabilities</th>
              </tr>
            </thead>
            <tbody>
              {providerRows.map((row) => {
                const tone = connectionStatusTone(row.status);
                return (
                  <tr
                    key={row.id}
                    data-testid={`app-settings-provider-row-${row.id}`}
                    className="border-b border-[var(--edge-border-subtle)] last:border-b-0"
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-[var(--edge-text-strong)]">{row.label}</div>
                      <div className="mt-0.5 text-[var(--edge-text-muted)]">{row.detail}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-[var(--edge-text-secondary)]">
                      {row.configured ? "Yes" : "No"}
                      {row.envGate ? (
                        <div className="mt-0.5 text-[var(--edge-text-muted)]">{row.envGate}</div>
                      ) : null}
                    </td>
                    <td
                      className={`px-3 py-2 align-top font-medium ${statusTextClass(tone)}`}
                      data-testid={`app-settings-provider-status-${row.id}`}
                    >
                      {providerStatusLabel(row.status)}
                    </td>
                    <td className="px-3 py-2 align-top text-[var(--edge-text-secondary)]">
                      {row.capabilities}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
