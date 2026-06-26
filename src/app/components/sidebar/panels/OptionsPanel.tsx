"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveChart } from "../../ActiveChartContext";
import { useMarketDataQuotesForSymbols } from "../../MarketDataProvider";
import {
  fetchOptionExpirations,
  fetchOptionsChain,
  formatOptionGreek,
  formatOptionIv,
  formatOptionPrice,
  groupContractsByStrike,
  type OptionsDataMeta,
} from "@/lib/options/optionsClient";
import {
  isExpirationPinned,
  pinExpirationDrawing,
} from "@/lib/options/pinExpirationDrawing";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  addRiskRulerPreset,
  getOptionPresetSelectionStatus,
  OPTION_SETUP_LABELS,
  optionPresetTooltip,
  type RiskRulerPresetInput,
} from "@/lib/risk/createRiskRulerPreset";
import { OPTION_SETUP_TYPES, type OptionSetupType } from "@edge/chart-core";

function SourceBadge({ meta }: { meta?: OptionsDataMeta }) {
  if (!meta?.source) return null;
  return (
    <span
      data-testid="options-source-badge"
      className="rounded bg-[var(--edge-bg-secondary)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]"
    >
      {meta.source}
      {meta.stale ? " · stale" : ""}
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

function strikeMoneynessClass(
  strike: number,
  spot: number | null,
): string {
  if (spot == null || !Number.isFinite(spot)) return "";
  const diff = Math.abs(strike - spot);
  if (diff / spot < 0.005) return "bg-[var(--edge-bg-secondary)]";
  return strike < spot ? "text-[var(--edge-positive)]" : "text-[var(--edge-negative)]";
}

export function OptionsPanel() {
  const snapshot = useActiveChart();
  const symbol = snapshot?.config.symbol ?? null;
  const marketQuotes = useMarketDataQuotesForSymbols(symbol ? [symbol] : []);

  const [expirations, setExpirations] = useState<string[]>([]);
  const [expMeta, setExpMeta] = useState<OptionsDataMeta | undefined>();
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  const [primaryExpiration, setPrimaryExpiration] = useState<string | null>(null);
  const [chainMeta, setChainMeta] = useState<OptionsDataMeta | undefined>();
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<
    ReturnType<typeof groupContractsByStrike>
  >([]);
  const [chainContracts, setChainContracts] = useState<OptionContractSnapshot[]>([]);
  const [chainMode, setChainMode] = useState<"atm" | "full">("atm");

  const spotPrice = useMemo(() => {
    const candles = snapshot?.dataWindow.candles ?? [];
    const last = candles[candles.length - 1];
    if (last?.c != null) return last.c;
    const quote = marketQuotes.quotes[0];
    return quote?.regularMarketPrice ?? null;
  }, [snapshot?.dataWindow.candles, marketQuotes.quotes]);

  const spotAnchor = useMemo(() => {
    const candles = snapshot?.dataWindow.candles ?? [];
    const lastIndex = candles.length - 1;
    const last = candles[lastIndex];
    if (!last) return null;
    return {
      timestamp: last.t,
      dataIndex: lastIndex,
    };
  }, [snapshot?.dataWindow.candles]);

  useEffect(() => {
    if (!symbol) {
      setExpirations([]);
      setExpMeta(undefined);
      setPrimaryExpiration(null);
      setContracts([]);
      setChainContracts([]);
      return;
    }

    let cancelled = false;
    setExpLoading(true);
    setExpError(null);
    setPrimaryExpiration(null);
    setContracts([]);
    setChainContracts([]);
    setChainMode("atm");

    fetchOptionExpirations(symbol)
      .then((result) => {
        if (cancelled) return;
        const dates = result.expirations.map((row) => row.expiration);
        setExpirations(dates);
        setExpMeta(result.meta);
        if (dates.length > 0) setPrimaryExpiration(dates[0] ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setExpirations([]);
        setExpError(err instanceof Error ? err.message : "Failed to load expirations");
      })
      .finally(() => {
        if (!cancelled) setExpLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !primaryExpiration) {
      setContracts([]);
      setChainContracts([]);
      return;
    }

    let cancelled = false;
    setChainLoading(true);
    setChainError(null);

    fetchOptionsChain(symbol, primaryExpiration, {
      strikeWindow:
        chainMode === "full"
          ? { mode: "full" }
          : { mode: "atm", count: 20, spot: spotPrice ?? undefined },
    })
      .then((result) => {
        if (cancelled) return;
        setContracts(groupContractsByStrike(result.chain.contracts));
        setChainContracts(result.chain.contracts);
        setChainMeta(result.meta);
      })
      .catch((err) => {
        if (cancelled) return;
        setContracts([]);
        setChainContracts([]);
        setChainError(err instanceof Error ? err.message : "Failed to load chain");
      })
      .finally(() => {
        if (!cancelled) setChainLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, primaryExpiration, chainMode, spotPrice]);

  const pinnedExpirations = useMemo(() => {
    const drawings = snapshot?.config.drawings ?? [];
    return expirations.filter((exp) => isExpirationPinned(drawings, exp));
  }, [expirations, snapshot?.config.drawings]);

  const handlePinExpiration = useCallback(
    (expiration: string) => {
      if (!snapshot || !symbol) return;
      const nextDrawings = pinExpirationDrawing(
        snapshot.config.drawings ?? [],
        expiration,
        symbol,
      );
      snapshot.onConfigChange({ ...snapshot.config, drawings: nextDrawings });
      snapshot.chartCommands.restoreDrawings(nextDrawings);
    },
    [snapshot, symbol],
  );

  const presetStatuses = useMemo(() => {
    if (spotPrice == null) return null;
    return Object.fromEntries(
      OPTION_SETUP_TYPES.map((setupType) => [
        setupType,
        getOptionPresetSelectionStatus(setupType, chainContracts, spotPrice),
      ]),
    ) as Record<
      OptionSetupType,
      ReturnType<typeof getOptionPresetSelectionStatus>
    >;
  }, [chainContracts, spotPrice]);

  const handleRiskRulerPreset = useCallback(
    (setupType: OptionSetupType) => {
      if (!snapshot || !symbol || spotPrice == null) return;
      const status = presetStatuses?.[setupType];
      if (chainContracts.length > 0 && status && !status.ok) return;
      const input: RiskRulerPresetInput = {
        setupType,
        spotPrice,
        symbol,
        expiration: primaryExpiration ?? undefined,
        timestamp: spotAnchor?.timestamp,
        dataIndex: spotAnchor?.dataIndex,
        contracts: chainContracts.length > 0 ? chainContracts : undefined,
      };
      const nextDrawings = addRiskRulerPreset(snapshot.config.drawings ?? [], input);
      snapshot.onConfigChange({ ...snapshot.config, drawings: nextDrawings });
      snapshot.chartCommands.restoreDrawings(nextDrawings);
    },
    [
      snapshot,
      symbol,
      spotPrice,
      primaryExpiration,
      spotAnchor,
      chainContracts,
      presetStatuses,
    ],
  );

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

  return (
    <div data-testid="options-panel" className="flex min-h-0 flex-1 flex-col text-xs">
      <div className="border-b border-[var(--edge-border)] px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="font-semibold text-[var(--edge-text-strong)]">{symbol} options</div>
          <SourceBadge meta={chainMeta ?? expMeta} />
        </div>
        <WarningsList warnings={[...(expMeta?.warnings ?? []), ...(chainMeta?.warnings ?? [])]} />
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
          <div className="flex flex-wrap gap-1">
            {expirations.map((expiration) => {
              const selected = expiration === primaryExpiration;
              const pinned = pinnedExpirations.includes(expiration);
              return (
                <button
                  key={expiration}
                  type="button"
                  data-testid={`options-exp-${expiration}`}
                  aria-pressed={selected}
                  onClick={() => setPrimaryExpiration(expiration)}
                  className={`rounded px-2 py-1 text-[10px] tabular-nums transition-colors ${
                    selected
                      ? "bg-[var(--edge-accent-blue)] text-white"
                      : "bg-[var(--edge-bg-secondary)] text-[var(--edge-text-primary)] hover:bg-[var(--edge-bg-tertiary)]"
                  }`}
                >
                  {expiration}
                  {pinned ? " · pinned" : ""}
                </button>
              );
            })}
          </div>
        )}
        {primaryExpiration && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="options-pin-primary"
              onClick={() => handlePinExpiration(primaryExpiration)}
              disabled={isExpirationPinned(snapshot.config.drawings ?? [], primaryExpiration)}
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
                    handlePinExpiration(value);
                    event.target.value = "";
                  }
                }}
                className="rounded bg-[var(--edge-bg-secondary)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)]"
              >
                <option value="">Add another…</option>
                {expirations
                  .filter((exp) => exp !== primaryExpiration)
                  .filter((exp) => !isExpirationPinned(snapshot.config.drawings ?? [], exp))
                  .map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
              </select>
            )}
          </div>
        )}
        {spotPrice != null && (
          <div
            data-testid="options-risk-ruler-presets"
            className="mt-3 border-t border-[var(--edge-border)] pt-3"
          >
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
              Quick risk ruler
            </div>
            <div className="space-y-2">
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
                      onClick={() => handleRiskRulerPreset(setupType)}
                      className="rounded bg-[var(--edge-bg-secondary)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)] hover:bg-[var(--edge-bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-50"
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
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {chainLoading && (
          <div data-testid="options-chain-loading" className="text-[var(--edge-text-secondary)]">
            Loading chain…
          </div>
        )}
        {chainError && (
          <div data-testid="options-chain-error" className="text-[var(--edge-negative)]" role="alert">
            {chainError}
          </div>
        )}
        {!chainLoading && !chainError && primaryExpiration && contracts.length === 0 && (
          <div className="text-[var(--edge-text-secondary)]">No contracts for this expiration.</div>
        )}
        {contracts.length > 0 && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-[var(--edge-text-secondary)]">
              {chainMode === "atm" ? "ATM strikes" : "All strikes"}
            </span>
            {chainMode === "atm" && (
              <button
                type="button"
                data-testid="options-load-all-strikes"
                onClick={() => setChainMode("full")}
                className="rounded bg-[var(--edge-bg-secondary)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)] hover:bg-[var(--edge-bg-tertiary)]"
              >
                Load all strikes
              </button>
            )}
          </div>
        )}
        {contracts.length > 0 && (
          <table data-testid="options-chain-table" className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="text-[var(--edge-text-secondary)]">
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
              </tr>
            </thead>
            <tbody>
              {contracts.map((row) => (
                <tr
                  key={row.strike}
                  className={`border-t border-[var(--edge-border)] tabular-nums ${strikeMoneynessClass(row.strike, spotPrice)}`}
                >
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
