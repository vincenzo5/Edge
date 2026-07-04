"use client";

import type { ReactNode } from "react";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  formatOptionGreek,
  formatOptionIv,
  formatOptionPrice,
  type StrikeRow,
} from "@/lib/options/optionsClient";
import {
  OPTION_SETUP_LABELS,
  optionPresetTooltip,
} from "@/lib/risk/createRiskRulerPreset";
import { OPTION_SETUP_TYPES, type OptionSetupType } from "@edge/chart-core";
import type { OptionsChainModel } from "./useOptionsChainModel";

function SourceBadge({ source, stale }: { source?: string; stale?: boolean }) {
  if (!source) return null;
  return (
    <span
      data-testid="options-source-badge"
      className="rounded bg-[var(--edge-bg-secondary)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]"
    >
      {source}
      {stale ? " · stale" : ""}
    </span>
  );
}

function WarningsList({ warnings }: { warnings?: string[] }) {
  if (!warnings?.length) return null;
  return (
    <ul
      data-testid="options-warnings"
      className="mb-2 space-y-1 text-[10px] text-[var(--edge-negative)]"
    >
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  );
}

function formatVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function heatBarWidth(value: number | null | undefined, max: number): string {
  if (value == null || !Number.isFinite(value) || max <= 0) return "0%";
  return `${Math.min(100, (value / max) * 100).toFixed(1)}%`;
}

function strikeRowClass(
  strike: number,
  spot: number | null,
  variant: "dialog" | "sidebar",
): string {
  if (spot == null || !Number.isFinite(spot)) return "";
  const diff = Math.abs(strike - spot);
  const isAtm = diff / spot < 0.005;
  if (isAtm) {
    return variant === "dialog"
      ? "bg-[var(--edge-accent-blue)]/10 ring-1 ring-inset ring-[var(--edge-accent-blue)]/30"
      : "bg-[var(--edge-bg-secondary)]";
  }
  if (variant === "dialog") {
    return strike < spot
      ? "bg-[var(--edge-positive)]/5"
      : "bg-[var(--edge-negative)]/5";
  }
  return strike < spot
    ? "text-[var(--edge-positive)]"
    : "text-[var(--edge-negative)]";
}

function HeatCell({
  value,
  max,
  children,
  align = "left",
}: {
  value: number | null | undefined;
  max: number;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td className="relative px-1 py-0.5">
      <div
        className={`absolute inset-y-0 ${align === "right" ? "right-0" : "left-0"} bg-[var(--edge-accent-blue)]/15`}
        style={{ width: heatBarWidth(value, max) }}
        aria-hidden
      />
      <span className="relative z-[1] tabular-nums">{children}</span>
    </td>
  );
}

function ChainLoadingState({
  symbol,
  expiration,
}: {
  symbol: string;
  expiration: string | null;
}) {
  const label = expiration
    ? `Loading ${symbol} ${expiration} options chain…`
    : `Loading ${symbol} options chain…`;

  return (
    <div
      data-testid="options-chain-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)]/40 px-4 py-8"
    >
      <div
        data-testid="options-chain-loading-spinner"
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--edge-border)] border-t-[var(--edge-accent-blue)]"
        aria-hidden
      />
      <div className="text-center">
        <div className="text-xs font-medium text-[var(--edge-text-strong)]">{label}</div>
        <div className="mt-1 text-[10px] text-[var(--edge-text-secondary)]">
          Fetching strikes and quotes from market data…
        </div>
      </div>
      <div className="w-full max-w-md space-y-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-3 animate-pulse rounded bg-[var(--edge-bg-tertiary)]"
            style={{ width: `${70 + (index % 3) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

type ChainTableProps = {
  contracts: StrikeRow[];
  spotPrice: number | null;
  variant: "dialog" | "sidebar";
  chainMode: "atm" | "full";
  chainLoading: boolean;
  chainError: string | null;
  symbol: string;
  primaryExpiration: string | null;
  onLoadAllStrikes: () => void;
  onAnalyzeContract?: (contract: OptionContractSnapshot) => void;
};

function ChainTable({
  contracts,
  spotPrice,
  variant,
  chainMode,
  chainLoading,
  chainError,
  symbol,
  primaryExpiration,
  onLoadAllStrikes,
  onAnalyzeContract,
}: ChainTableProps) {
  const maxVolume = useMemoMax(contracts, (r) =>
    Math.max(r.call?.volume ?? 0, r.put?.volume ?? 0),
  );

  if (chainLoading) {
    return <ChainLoadingState symbol={symbol} expiration={primaryExpiration} />;
  }

  if (chainError) {
    return (
      <div data-testid="options-chain-error" className="text-[var(--edge-negative)]" role="alert">
        {chainError}
      </div>
    );
  }

  if (primaryExpiration && contracts.length === 0) {
    return <div className="text-[var(--edge-text-secondary)]">No contracts for this expiration.</div>;
  }

  if (contracts.length === 0) return null;

  const isDialog = variant === "dialog";

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--edge-text-secondary)]">
          {chainMode === "atm" ? "ATM strikes" : "All strikes"}
        </span>
        {chainMode === "atm" && (
          <button
            type="button"
            data-testid="options-load-all-strikes"
            onClick={onLoadAllStrikes}
            className="rounded bg-[var(--edge-bg-secondary)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)] hover:bg-[var(--edge-bg-tertiary)]"
          >
            Load all strikes
          </button>
        )}
      </div>
      <div className={isDialog ? "overflow-x-auto" : ""}>
        <table
          data-testid="options-chain-table"
          className={`w-full border-collapse text-[10px] ${isDialog ? "min-w-[720px]" : ""}`}
        >
          <thead className="sticky top-0 z-[2] bg-[var(--edge-surface-panel)]">
            <tr className="text-[var(--edge-text-secondary)]">
              {isDialog ? (
                <>
                  <th className="px-1 py-1 text-left font-medium">Call</th>
                  <th className="px-1 py-1 text-left font-medium">Vol</th>
                  <th className="px-1 py-1 text-left font-medium">Bid</th>
                  <th className="px-1 py-1 text-left font-medium">Ask</th>
                  <th className="px-1 py-1 text-center font-medium">Strike</th>
                  <th className="px-1 py-1 text-left font-medium">Bid</th>
                  <th className="px-1 py-1 text-left font-medium">Ask</th>
                  <th className="px-1 py-1 text-left font-medium">Vol</th>
                  <th className="px-1 py-1 text-left font-medium">Put</th>
                </>
              ) : (
                <>
                  <th className="px-1 py-1 text-left font-medium">Call bid</th>
                  <th className="px-1 py-1 text-left font-medium">Call ask</th>
                  <th className="px-1 py-1 text-left font-medium">Vol</th>
                  <th className="px-1 py-1 text-left font-medium">OI</th>
                  <th className="px-1 py-1 text-left font-medium">IV</th>
                  <th className="px-1 py-1 text-left font-medium">Δ</th>
                  <th className="px-1 py-1 text-center font-medium">Strike</th>
                  <th className="px-1 py-1 text-left font-medium">Put bid</th>
                  <th className="px-1 py-1 text-left font-medium">Put ask</th>
                  <th className="px-1 py-1 text-left font-medium">Vol</th>
                  <th className="px-1 py-1 text-left font-medium">OI</th>
                  <th className="px-1 py-1 text-left font-medium">IV</th>
                  <th className="px-1 py-1 text-left font-medium">Δ</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {contracts.map((row) => (
              <tr
                key={row.strike}
                data-testid={`options-chain-row-${row.strike}`}
                className={`border-t border-[var(--edge-border)] tabular-nums ${strikeRowClass(row.strike, spotPrice, variant)}`}
              >
                {isDialog ? (
                  <>
                    <td className="px-1 py-0.5">
                      {row.call && onAnalyzeContract ? (
                        <button
                          type="button"
                          data-testid={`options-analyze-call-${row.strike}`}
                          onClick={() => onAnalyzeContract(row.call!)}
                          className="rounded bg-[var(--edge-bg-secondary)] px-1.5 py-0.5 text-[9px] text-[var(--edge-accent-blue)] hover:bg-[var(--edge-accent-blue)]/10"
                        >
                          Analyze
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <HeatCell value={row.call?.volume} max={maxVolume}>
                      {formatVolume(row.call?.volume)}
                    </HeatCell>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.call?.bid)}</td>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.call?.ask)}</td>
                    <td className="px-1 py-0.5 text-center font-semibold text-[var(--edge-text-strong)]">
                      {row.strike}
                    </td>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.put?.bid)}</td>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.put?.ask)}</td>
                    <HeatCell value={row.put?.volume} max={maxVolume} align="right">
                      {formatVolume(row.put?.volume)}
                    </HeatCell>
                    <td className="px-1 py-0.5 text-right">
                      {row.put && onAnalyzeContract ? (
                        <button
                          type="button"
                          data-testid={`options-analyze-put-${row.strike}`}
                          onClick={() => onAnalyzeContract(row.put!)}
                          className="rounded bg-[var(--edge-bg-secondary)] px-1.5 py-0.5 text-[9px] text-[var(--edge-accent-blue)] hover:bg-[var(--edge-accent-blue)]/10"
                        >
                          Analyze
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.call?.bid)}</td>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.call?.ask)}</td>
                    <td className="px-1 py-0.5">{row.call?.volume ?? "—"}</td>
                    <td className="px-1 py-0.5">{row.call?.openInterest ?? "—"}</td>
                    <td className="px-1 py-0.5">{formatOptionIv(row.call?.impliedVolatility)}</td>
                    <td className="px-1 py-0.5">{formatOptionGreek(row.call?.delta)}</td>
                    <td className="px-1 py-0.5 text-center font-medium">{row.strike}</td>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.put?.bid)}</td>
                    <td className="px-1 py-0.5">{formatOptionPrice(row.put?.ask)}</td>
                    <td className="px-1 py-0.5">{row.put?.volume ?? "—"}</td>
                    <td className="px-1 py-0.5">{row.put?.openInterest ?? "—"}</td>
                    <td className="px-1 py-0.5">{formatOptionIv(row.put?.impliedVolatility)}</td>
                    <td className="px-1 py-0.5">{formatOptionGreek(row.put?.delta)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function useMemoMax(contracts: StrikeRow[], selector: (row: StrikeRow) => number): number {
  let max = 0;
  for (const row of contracts) {
    max = Math.max(max, selector(row));
  }
  return max;
}

function ExpirationTabs({
  expirations,
  primaryExpiration,
  pinnedExpirations,
  onSelect,
  compact,
}: {
  expirations: string[];
  primaryExpiration: string | null;
  pinnedExpirations: string[];
  onSelect: (expiration: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex gap-1 ${compact ? "flex-wrap" : "overflow-x-auto pb-1"}`}>
      {expirations.map((expiration) => {
        const selected = expiration === primaryExpiration;
        const pinned = pinnedExpirations.includes(expiration);
        return (
          <button
            key={expiration}
            type="button"
            data-testid={`options-exp-${expiration}`}
            aria-pressed={selected}
            onClick={() => onSelect(expiration)}
            className={`shrink-0 rounded px-2 py-1 text-[10px] tabular-nums transition-colors ${
              selected
                ? "border border-[var(--edge-accent-blue)] bg-[var(--edge-accent-blue)]/15 text-[var(--edge-accent-blue)]"
                : "bg-[var(--edge-bg-secondary)] text-[var(--edge-text-primary)] hover:bg-[var(--edge-bg-tertiary)]"
            }`}
          >
            {expiration}
            {pinned ? " · pinned" : ""}
          </button>
        );
      })}
    </div>
  );
}

const RISK_PRESET_BUTTON_CLASS =
  "w-full rounded-md border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--edge-text-primary)] shadow-sm transition-colors hover:border-[var(--edge-accent-blue)] hover:bg-[var(--edge-accent-blue)]/10 hover:text-[var(--edge-accent-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--edge-accent-blue)] disabled:cursor-not-allowed disabled:border-[var(--edge-border)] disabled:bg-[var(--edge-bg-secondary)] disabled:text-[var(--edge-text-muted)] disabled:opacity-60 disabled:shadow-none";

function RiskRulerPresets({
  model,
  compact,
  atTop,
}: {
  model: OptionsChainModel;
  compact?: boolean;
  atTop?: boolean;
}) {
  const { spotPrice, chainContracts, presetStatuses, addRiskRulerPreset } = model;
  if (spotPrice == null) return null;

  return (
    <div
      data-testid="options-risk-ruler-presets"
      className={
        atTop
          ? "mb-3 rounded-md border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)]/30 px-3 py-2.5"
          : `border-t border-[var(--edge-border)] pt-3 ${compact ? "mt-2" : "mt-3"}`
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--edge-text-strong)]">
          Quick risk ruler
        </div>
        <span className="text-[10px] text-[var(--edge-text-secondary)]">Click to add to chart</span>
      </div>
      <div className={compact ? "space-y-2" : "grid grid-cols-2 gap-2"}>
        {OPTION_SETUP_TYPES.map((setupType) => {
          const status = presetStatuses?.[setupType];
          const chainLoaded = chainContracts.length > 0;
          const disabled = chainLoaded && status != null && !status.ok;
          return (
            <div
              key={setupType}
              data-testid={`options-risk-preset-row-${setupType}`}
              className="space-y-1"
            >
              <button
                type="button"
                data-testid={`options-risk-preset-${setupType}`}
                title={optionPresetTooltip(setupType)}
                disabled={disabled}
                onClick={() => addRiskRulerPreset(setupType)}
                className={RISK_PRESET_BUTTON_CLASS}
              >
                {OPTION_SETUP_LABELS[setupType]}
              </button>
              {status?.ok ? (
                <div
                  data-testid={`options-risk-preset-preview-${setupType}`}
                  className="text-[10px] text-[var(--edge-text-secondary)]"
                >
                  {status.preview}
                </div>
              ) : chainLoaded && status ? (
                <div
                  data-testid={`options-risk-preset-reason-${setupType}`}
                  className="text-[10px] text-[var(--edge-text-secondary)]"
                >
                  {status.reason}
                </div>
              ) : !chainLoaded ? (
                <div
                  data-testid={`options-risk-preset-fallback-${setupType}`}
                  className="text-[10px] text-[var(--edge-text-secondary)]"
                >
                  Spot estimate until chain loads
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PinControls({ model }: { model: OptionsChainModel }) {
  const {
    snapshot,
    expirations,
    primaryExpiration,
    pinExpiration,
    isExpirationPinned,
  } = model;

  if (!primaryExpiration || !snapshot) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        data-testid="options-pin-primary"
        onClick={() => pinExpiration(primaryExpiration)}
        disabled={isExpirationPinned(primaryExpiration)}
        className="rounded bg-[var(--edge-bg-secondary)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)] hover:bg-[var(--edge-bg-tertiary)] disabled:opacity-50"
      >
        Pin expiration
      </button>
      {expirations.length > 1 && (
        <select
          data-testid="options-pin-add-select"
          aria-label="Pin another expiration"
          defaultValue=""
          onChange={(event) => {
            const value = event.target.value;
            if (value) {
              pinExpiration(value);
              event.target.value = "";
            }
          }}
          className="rounded bg-[var(--edge-bg-secondary)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)]"
        >
          <option value="">Add another…</option>
          {expirations
            .filter((exp) => exp !== primaryExpiration)
            .filter((exp) => !isExpirationPinned(exp))
            .map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}

export type OptionsChainViewProps = {
  model: OptionsChainModel;
  variant: "dialog" | "sidebar";
  onAnalyzeContract?: (contract: OptionContractSnapshot) => void;
};

export function OptionsChainView({
  model,
  variant,
  onAnalyzeContract,
}: OptionsChainViewProps) {
  const {
    snapshot,
    symbol,
    spotPrice,
    expirations,
    expMeta,
    expLoading,
    expError,
    primaryExpiration,
    chainMeta,
    chainLoading,
    chainError,
    contracts,
    chainMode,
    pinnedExpirations,
    selectExpiration,
    loadAllStrikes,
  } = model;

  if (!snapshot) {
    return (
      <div className="px-3 py-2 text-xs italic text-[var(--edge-text-secondary)]">
        Focus a chart to view options.
      </div>
    );
  }

  if (!symbol) {
    return (
      <div className="px-3 py-2 text-xs text-[var(--edge-text-secondary)]">
        Select a symbol to view options.
      </div>
    );
  }

  const meta = chainMeta ?? expMeta;
  const warnings = [...(expMeta?.warnings ?? []), ...(chainMeta?.warnings ?? [])];

  if (variant === "sidebar") {
    return (
      <div data-testid="options-panel" className="flex min-h-0 flex-1 flex-col text-xs">
        <div className="border-b border-[var(--edge-border)] px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="font-semibold text-[var(--edge-text-strong)]">{symbol} options</div>
            <SourceBadge source={meta?.source} stale={meta?.stale} />
          </div>
          <WarningsList warnings={warnings} />
          {expLoading && (
            <div data-testid="options-exp-loading" className="text-[var(--edge-text-secondary)]">
              Loading expirations…
            </div>
          )}
          {expError && (
            <div data-testid="options-exp-error" className="text-[var(--edge-negative)]" role="alert">
              {expError}
            </div>
          )}
          {!expLoading && !expError && expirations.length === 0 && (
            <div className="text-[var(--edge-text-secondary)]">No expirations available.</div>
          )}
          {expirations.length > 0 && (
            <ExpirationTabs
              expirations={expirations}
              primaryExpiration={primaryExpiration}
              pinnedExpirations={pinnedExpirations}
              onSelect={selectExpiration}
              compact
            />
          )}
          <PinControls model={model} />
          <RiskRulerPresets model={model} compact />
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
          <ChainTable
            contracts={contracts}
            spotPrice={spotPrice}
            variant="sidebar"
            chainMode={chainMode}
            chainLoading={chainLoading}
            chainError={chainError}
            symbol={symbol}
            primaryExpiration={primaryExpiration}
            onLoadAllStrikes={loadAllStrikes}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="options-chain-view-dialog"
      className="flex min-h-0 flex-1 flex-col overflow-hidden text-xs"
    >
      <div
        data-testid="options-chain-dialog-scroll"
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="border-b border-[var(--edge-border)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-[var(--edge-text-strong)]">
                {symbol} options chain
              </div>
              {spotPrice != null && (
                <div className="mt-0.5 text-[10px] text-[var(--edge-text-secondary)]">
                  Spot {spotPrice.toFixed(2)}
                  {primaryExpiration ? ` · ${primaryExpiration}` : ""}
                </div>
              )}
            </div>
            <SourceBadge source={meta?.source} stale={meta?.stale} />
          </div>
          <WarningsList warnings={warnings} />
          {expLoading && (
            <div
              data-testid="options-exp-loading"
              role="status"
              className="rounded-md border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)]/40 px-3 py-2 text-[var(--edge-text-secondary)]"
            >
              Loading expirations…
            </div>
          )}
          {expError && (
            <div data-testid="options-exp-error" className="text-[var(--edge-negative)]" role="alert">
              {expError}
            </div>
          )}
          {!expLoading && !expError && expirations.length === 0 && (
            <div className="text-[var(--edge-text-secondary)]">No expirations available.</div>
          )}
          {expirations.length > 0 && (
            <ExpirationTabs
              expirations={expirations}
              primaryExpiration={primaryExpiration}
              pinnedExpirations={pinnedExpirations}
              onSelect={selectExpiration}
            />
          )}
          <PinControls model={model} />
          <RiskRulerPresets model={model} atTop />
        </div>
        <div className="px-3 py-2">
          <ChainTable
            contracts={contracts}
            spotPrice={spotPrice}
            variant="dialog"
            chainMode={chainMode}
            chainLoading={chainLoading}
            chainError={chainError}
            symbol={symbol}
            primaryExpiration={primaryExpiration}
            onLoadAllStrikes={loadAllStrikes}
            onAnalyzeContract={onAnalyzeContract}
          />
        </div>
      </div>
    </div>
  );
}
