"use client";

import { useMemo } from "react";
import { useRiskSettings } from "../../RiskSettingsProvider";
import {
  RISK_ACCOUNT_BASIS_LABELS,
  type RiskAccountBasis,
  type RiskSizingMode,
} from "@/lib/risk/riskSettings";
import EdgeSegmentedTabs from "../../design-system/EdgeSegmentedTabs";
import { EdgeButton } from "../../design-system";
import { PanelPopOutButton } from "../PanelChromeActions";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function RiskSettingsPanel() {
  const {
    settings,
    dollarRisk,
    accountBasisValue,
    basisStale,
    updateSettings,
    resetSettings,
  } = useRiskSettings();

  const readout = useMemo(() => {
    if (settings.sizingMode === "absolute") {
      return `Current risk per trade: ${formatMoney(settings.absoluteRisk)} (fixed $)`;
    }
    const basisLabel = RISK_ACCOUNT_BASIS_LABELS[settings.accountBasis];
    const basisMoney = formatMoney(accountBasisValue);
    const riskMoney = formatMoney(dollarRisk);
    return `Current risk per trade: ${riskMoney} (${settings.riskPercent}% of ${basisMoney} ${basisLabel})`;
  }, [settings, dollarRisk, accountBasisValue]);

  return (
    <div
      data-testid="risk-settings-panel"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Risk settings</h2>
        <div className="flex items-center gap-1">
          <PanelPopOutButton label="Pop out" />
          <EdgeButton type="button" data-testid="risk-settings-reset" onClick={resetSettings}>
            Reset
          </EdgeButton>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
          Sizing mode
        </div>
        <EdgeSegmentedTabs
          segments={[
            { id: "percent", label: "% of account" },
            { id: "absolute", label: "$ absolute" },
          ]}
          value={settings.sizingMode}
          onChange={(id) => updateSettings({ sizingMode: id as RiskSizingMode })}
        />
      </div>

      {settings.sizingMode === "percent" ? (
        <label className="block text-[var(--edge-text-secondary)]">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
            Risk percent
          </span>
          <input
            type="number"
            min={0.01}
            max={100}
            step={0.1}
            value={settings.riskPercent}
            onChange={(event) =>
              updateSettings({ riskPercent: Number.parseFloat(event.target.value) || 1 })
            }
            className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
            data-testid="risk-settings-percent"
          />
        </label>
      ) : (
        <label className="block text-[var(--edge-text-secondary)]">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
            Risk amount $
          </span>
          <input
            type="number"
            min={1}
            value={settings.absoluteRisk}
            onChange={(event) =>
              updateSettings({ absoluteRisk: Number.parseFloat(event.target.value) || 1 })
            }
            className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
            data-testid="risk-settings-absolute"
          />
        </label>
      )}

      {settings.sizingMode === "percent" ? (
        <label className="block text-[var(--edge-text-secondary)]">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
            Account basis
          </span>
          <select
            value={settings.accountBasis}
            onChange={(event) =>
              updateSettings({ accountBasis: event.target.value as RiskAccountBasis })
            }
            className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
            data-testid="risk-settings-basis"
          >
            {(Object.keys(RISK_ACCOUNT_BASIS_LABELS) as RiskAccountBasis[]).map((basis) => (
              <option key={basis} value={basis}>
                {RISK_ACCOUNT_BASIS_LABELS[basis]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block text-[var(--edge-text-secondary)]">
        <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
          Fallback capital $
        </span>
        <input
          type="number"
          min={0}
          value={settings.manualCapital}
          onChange={(event) =>
            updateSettings({ manualCapital: Number.parseFloat(event.target.value) || 0 })
          }
          className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
          data-testid="risk-settings-manual-capital"
        />
        <p className="mt-0.5 text-[10px] text-[var(--edge-text-muted)]">
          Used when account is disconnected or basis is Manual.
        </p>
      </label>

      <div
        data-testid="risk-settings-readout"
        className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2 text-[11px] text-[var(--edge-text-secondary)]"
      >
        {readout}
        {basisStale ? (
          <span
            data-testid="risk-settings-stale-badge"
            className="ml-1 rounded bg-[var(--edge-bg-secondary)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]"
          >
            stale
          </span>
        ) : null}
      </div>
    </div>
  );
}
