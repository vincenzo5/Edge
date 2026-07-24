"use client";

import { useMemo, useRef } from "react";
import EdgeSelect from "../design-system/EdgeSelect";
import { labeledFieldClass } from "../design-system/styles";
import EdgeSlideOver from "../design-system/EdgeSlideOver";
import { useAppTimeZone } from "../AppTimeZoneProvider";
import { useAppTheme } from "../AppThemeProvider";
import { buildTimeZoneMenuOptions, type ChartTimeZone } from "@/lib/chart/timeZone";
import {
  PALETTES,
  PALETTE_DESCRIPTIONS,
  PALETTE_LABELS,
  type PaletteId,
} from "@/lib/design-system/palettes";
import { getEdgeTokens } from "@/lib/design-system/edge";
import ConnectionsSettingsSection from "./ConnectionsSettingsSection";
import MarketDataSettingsSection from "./MarketDataSettingsSection";
import { useSettingsMarketDataHealth } from "./useSettingsMarketDataHealth";
import type { TradingAccount } from "@/lib/trading/types";

type Props = {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  accounts?: TradingAccount[];
  accountsLoading?: boolean;
  recoveringTws?: boolean;
  recoverMessage?: string | null;
  onRecoverTws?: () => void;
};

function PaletteSwatches({ palette, active }: { palette: PaletteId; active: boolean }) {
  const { theme } = useAppTheme();
  const tokens = getEdgeTokens(palette, theme);
  const swatches = [
    tokens.surfaceChart,
    tokens.surfacePanel,
    tokens.accentBlue,
    tokens.positive,
    tokens.negative,
  ];

  return (
    <span className="flex gap-1" aria-hidden>
      {swatches.map((color) => (
        <span
          key={color}
          className="h-3 w-3 rounded-[2px] border border-[var(--edge-border-subtle)]"
          style={{ backgroundColor: color }}
        />
      ))}
      {active ? (
        <span className="sr-only">Selected</span>
      ) : null}
    </span>
  );
}

export default function AppSettingsShell({
  open,
  onClose,
  returnFocusRef,
  accounts = [],
  accountsLoading = false,
  recoveringTws = false,
  recoverMessage = null,
  onRecoverTws = () => {},
}: Props) {
  const localTriggerRef = useRef<HTMLElement>(null);
  const { timeZone, setTimeZone } = useAppTimeZone();
  const { theme, palette, setPalette } = useAppTheme();
  const { health, loading: healthLoading, error: healthError } = useSettingsMarketDataHealth(open);

  const timeZoneOptions = useMemo(
    () =>
      buildTimeZoneMenuOptions()
        .filter((opt) => opt.id !== "exchange")
        .map((opt) => ({
          value: opt.id as ChartTimeZone,
          label: opt.label,
        })),
    [],
  );

  return (
    <EdgeSlideOver
      open={open}
      title="Application settings"
      subtitle="Global preferences for Edge"
      onClose={onClose}
      testId="app-settings-shell"
      returnFocusRef={returnFocusRef ?? localTriggerRef}
    >
      <div className="space-y-6 p-1">
        <section className="space-y-3" aria-labelledby="app-settings-appearance-heading">
          <h3
            id="app-settings-appearance-heading"
            className="text-sm font-semibold text-[var(--edge-text-strong)]"
          >
            Appearance
          </h3>
          <p className="text-xs text-[var(--edge-text-secondary)]">
            Color palette applies in both light and dark mode. Switch light or dark from the sun/moon
            control in the header.
          </p>
          <div
            role="radiogroup"
            aria-label="Color palette"
            className="grid gap-2"
            data-testid="app-palette-picker"
          >
            {PALETTES.map((option) => {
              const selected = palette === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`app-palette-option-${option}`}
                  data-selected={selected ? "true" : "false"}
                  onClick={() => setPalette(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[var(--edge-radius-md)] border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-[var(--edge-accent-blue)] bg-[var(--edge-surface-active)]"
                      : "border-[var(--edge-border)] bg-[var(--edge-surface-panel)] hover:bg-[var(--edge-surface-hover)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--edge-text-strong)]">
                      {PALETTE_LABELS[option]}
                    </span>
                    <span className="block text-xs text-[var(--edge-text-secondary)]">
                      {PALETTE_DESCRIPTIONS[option]}
                    </span>
                  </span>
                  <PaletteSwatches palette={option} active={selected} />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--edge-text-muted)]">
            Preview swatches reflect the current {theme} mode.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--edge-text-strong)]">Defaults</h3>
          <div className={labeledFieldClass()}>
            <label htmlFor="app-default-timezone" className="text-[var(--edge-text-secondary)]">
              Default timezone
            </label>
            <EdgeSelect
              value={timeZone}
              options={timeZoneOptions}
              onChange={setTimeZone}
              variant="field"
              density="standard"
              testId="app-default-timezone"
              aria-label="Default timezone"
            />
          </div>
          <p className="text-xs text-[var(--edge-text-secondary)]">
            Charts inherit this timezone until you change it from the chart clock or chart settings.
          </p>
        </section>

        <ConnectionsSettingsSection
          enabled={open}
          health={health}
          healthLoading={healthLoading}
          healthError={healthError}
          accounts={accounts}
          accountsLoading={accountsLoading}
          recoveringTws={recoveringTws}
          recoverMessage={recoverMessage}
          onRecoverTws={onRecoverTws}
        />

        <MarketDataSettingsSection
          enabled={open}
          health={health}
          healthLoading={healthLoading}
          healthError={healthError}
        />
      </div>
    </EdgeSlideOver>
  );
}
