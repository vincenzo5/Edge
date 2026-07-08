"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  formatExpirationAriaLabel,
  formatExpirationDteLabel,
  formatExpirationTabLabel,
} from "@/lib/options/chainDisplay";
import {
  OPTION_SETUP_LABELS,
  optionPresetTooltip,
} from "@/lib/risk/createRiskRulerPreset";
import { OPTION_SETUP_TYPES } from "@edge/chart-core";
import EdgeIconButton from "../design-system/EdgeIconButton";
import { headerButtonClass, segmentedTabClass } from "../design-system/styles";
import { OptionsChainTable } from "./OptionsChainTable";
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

function ExpirationPinBadge({ expiration }: { expiration: string }) {
  return (
    <span
      data-testid={`options-exp-pin-${expiration}`}
      aria-label="Pinned"
      className="absolute right-0.5 top-0.5 text-[var(--edge-accent-blue)]"
    >
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5 fill-current"
      >
        <path d="M6 1.5 7.2 4.5H10.5L8 6.3 8.9 9.5 6 7.8 3.1 9.5 4 6.3 1.5 4.5H4.8L6 1.5Z" />
      </svg>
    </span>
  );
}

function ExpirationTabs({
  expirations,
  primaryExpiration,
  pinnedExpirations,
  onSelect,
}: {
  expirations: string[];
  primaryExpiration: string | null;
  pinnedExpirations: string[];
  onSelect: (expiration: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollAffordances = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 1);
  }, []);

  useEffect(() => {
    updateScrollAffordances();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollAffordances, { passive: true });
    const observer = new ResizeObserver(updateScrollAffordances);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollAffordances);
      observer.disconnect();
    };
  }, [expirations, updateScrollAffordances]);

  const scrollByAmount = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div
      data-testid="options-expiration-tabs"
      className="flex min-w-0 items-center gap-0.5"
    >
      {canScrollLeft && (
        <EdgeIconButton
          size="sm"
          aria-label="Scroll expirations left"
          data-testid="options-exp-scroll-left"
          onClick={() => scrollByAmount(-120)}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <path d="M10.5 3.5 6 8l4.5 4.5-.7.7L4.6 8l5.2-5.2.7.7Z" />
          </svg>
        </EdgeIconButton>
      )}
      <div
        ref={scrollRef}
        data-testid="options-expiration-tabs-scroll"
        className="min-w-0 flex-1 overflow-x-auto rounded border border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-nowrap gap-0.5">
          {expirations.map((expiration) => {
            const selected = expiration === primaryExpiration;
            const pinned = pinnedExpirations.includes(expiration);
            return (
              <button
                key={expiration}
                type="button"
                data-testid={`options-exp-${expiration}`}
                aria-pressed={selected}
                aria-label={formatExpirationAriaLabel(expiration)}
                title={expiration}
                onClick={() => onSelect(expiration)}
                className={`relative shrink-0 min-w-[3.25rem] px-2.5 py-1 text-xs tabular-nums transition-colors ${segmentedTabClass(selected)} ${
                  selected
                    ? "ring-1 ring-inset ring-[var(--edge-accent-blue)]/40"
                    : ""
                }`}
              >
                {pinned ? <ExpirationPinBadge expiration={expiration} /> : null}
                <span className="block leading-tight">{formatExpirationTabLabel(expiration)}</span>
                <span
                  data-testid={`options-exp-dte-${expiration}`}
                  className="block text-[10px] leading-tight text-[var(--edge-text-muted)]"
                >
                  {formatExpirationDteLabel(expiration)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {canScrollRight && (
        <EdgeIconButton
          size="sm"
          aria-label="Scroll expirations right"
          data-testid="options-exp-scroll-right"
          onClick={() => scrollByAmount(120)}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <path d="M5.5 3.5 10 8l-4.5 4.5.7.7L11.4 8 6.2 2.8l-.7.7Z" />
          </svg>
        </EdgeIconButton>
      )}
    </div>
  );
}

const RISK_PRESET_BUTTON_CLASS =
  "rounded-md border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1.5 text-[10px] font-medium text-[var(--edge-text-primary)] shadow-sm transition-colors hover:border-[var(--edge-accent-blue)] hover:bg-[var(--edge-accent-blue)]/10 hover:text-[var(--edge-accent-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--edge-accent-blue)] disabled:cursor-not-allowed disabled:border-[var(--edge-border)] disabled:bg-[var(--edge-bg-secondary)] disabled:text-[var(--edge-text-muted)] disabled:opacity-60 disabled:shadow-none";

function RiskRulerPresets({
  model,
  variant,
}: {
  model: OptionsChainModel;
  variant: "dialog" | "sidebar";
}) {
  const { spotPrice, chainContracts, presetStatuses, addRiskRulerPreset } = model;
  if (spotPrice == null) return null;

  const buttonLayoutClass =
    variant === "dialog"
      ? "grid grid-cols-2 gap-1.5 sm:grid-cols-4"
      : "flex flex-wrap gap-1.5";

  return (
    <div
      data-testid="options-risk-ruler-presets"
      className="shrink-0 border-t border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-3 py-2"
    >
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
        Quick presets
      </div>
      <div className={buttonLayoutClass}>
        {OPTION_SETUP_TYPES.map((setupType) => {
          const status = presetStatuses?.[setupType];
          const chainLoaded = chainContracts.length > 0;
          const disabled = chainLoaded && status != null && !status.ok;
          const tooltip = [
            optionPresetTooltip(setupType),
            status?.ok ? status.preview : status?.reason,
          ]
            .filter(Boolean)
            .join(" — ");
          return (
            <button
              key={setupType}
              type="button"
              data-testid={`options-risk-preset-${setupType}`}
              title={tooltip}
              disabled={disabled}
              onClick={() => addRiskRulerPreset(setupType)}
              className={`${RISK_PRESET_BUTTON_CLASS} ${variant === "sidebar" ? "min-w-[7rem] flex-1" : "w-full"}`}
            >
              {OPTION_SETUP_LABELS[setupType]}
            </button>
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

  const pinButtonClass = headerButtonClass("dark");

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        data-testid="options-pin-primary"
        onClick={() => pinExpiration(primaryExpiration)}
        disabled={isExpirationPinned(primaryExpiration)}
        className={pinButtonClass}
      >
        Pin
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
          className="max-w-[7rem] rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-1.5 py-1 text-[10px] text-[var(--edge-text-primary)]"
        >
          <option value="">+ pin</option>
          {expirations
            .filter((exp) => exp !== primaryExpiration)
            .filter((exp) => !isExpirationPinned(exp))
            .map((exp) => (
              <option key={exp} value={exp}>
                {formatExpirationTabLabel(exp)}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}

function OptionsChainHeader({
  model,
  meta,
  warnings,
  variant,
}: {
  model: OptionsChainModel;
  meta: OptionsChainModel["expMeta"];
  warnings: string[];
  variant: "dialog" | "sidebar";
}) {
  const {
    symbol,
    spotPrice,
    expirations,
    expLoading,
    expError,
    primaryExpiration,
    pinnedExpirations,
    selectExpiration,
  } = model;

  const spotLine = spotPrice != null ? `Spot ${spotPrice.toFixed(2)}` : null;

  return (
    <div
      data-testid="options-chain-header"
      className={`shrink-0 border-b border-[var(--edge-border)] ${variant === "sidebar" ? "px-3 py-2" : "px-4 py-2"}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`font-semibold text-[var(--edge-text-strong)] ${variant === "dialog" ? "text-sm" : ""}`}
          >
            {variant === "dialog" ? `${symbol} options chain` : `${symbol} options`}
          </div>
          {spotLine && (
            <div className="text-[10px] text-[var(--edge-text-secondary)]">{spotLine}</div>
          )}
        </div>
        <SourceBadge source={meta?.source} stale={meta?.stale} />
      </div>
      <WarningsList warnings={warnings} />
      {expLoading && (
        <div
          data-testid="options-exp-loading"
          role={variant === "dialog" ? "status" : undefined}
          className={
            variant === "dialog"
              ? "rounded-md border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)]/40 px-3 py-2 text-[var(--edge-text-secondary)]"
              : "text-[var(--edge-text-secondary)]"
          }
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
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
              Expirations
            </span>
            <PinControls model={model} />
          </div>
          <ExpirationTabs
            expirations={expirations}
            primaryExpiration={primaryExpiration}
            pinnedExpirations={pinnedExpirations}
            onSelect={selectExpiration}
          />
        </div>
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
    expMeta,
    chainMeta,
    primaryExpiration,
    chainLoading,
    chainError,
    contracts,
    chainMode,
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

  const chainTable = (
    <OptionsChainTable
      contracts={contracts}
      spotPrice={spotPrice}
      chainMode={chainMode}
      chainLoading={chainLoading}
      chainError={chainError}
      symbol={symbol}
      primaryExpiration={primaryExpiration}
      onLoadAllStrikes={loadAllStrikes}
      onAnalyzeContract={onAnalyzeContract}
    />
  );

  const shellClass =
    variant === "sidebar"
      ? "flex min-h-0 flex-1 flex-col text-xs"
      : "flex min-h-0 flex-1 flex-col overflow-hidden text-xs";

  return (
    <div data-testid={variant === "sidebar" ? "options-panel" : "options-chain-view-dialog"} className={shellClass}>
      <OptionsChainHeader model={model} meta={meta} warnings={warnings} variant={variant} />
      <div
        data-testid="options-chain-scroll"
        className={`min-h-0 flex-1 overflow-auto ${variant === "sidebar" ? "px-2 py-2" : "px-3 py-2"}`}
      >
        {chainTable}
      </div>
      <RiskRulerPresets model={model} variant={variant} />
    </div>
  );
}
