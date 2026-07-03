"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  buildContractMap,
  contractMapKey,
  findContractForLeg,
  legFromContract,
  listStrikesForLeg,
  nearestChainStrike,
  resolveEntryPremium,
  validateAndEvaluateStrategy,
  type EntryPriceMode,
  type ExitPriceMode,
  type IvScenario,
  type PayoffCell,
  type StrategyLegInput,
} from "@/lib/risk/optionsStrategyRisk";
import { EdgeButton } from "../design-system";
import type { OptionsChainModel } from "./useOptionsChainModel";

export type RiskCalculatorSeedLeg = {
  contract: OptionContractSnapshot;
  action?: "buy" | "sell";
  quantity?: number;
};

type Props = {
  model: OptionsChainModel;
  dollarRisk: number | null;
  basisStale: boolean;
  seedLeg?: RiskCalculatorSeedLeg | null;
  onSeedConsumed?: () => void;
  onDone?: () => void;
};

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function pnlClass(value: number): string {
  if (value > 0) return "text-[var(--edge-positive)]";
  if (value < 0) return "text-[var(--edge-negative)]";
  return "text-[var(--edge-text-secondary)]";
}

function heatClass(value: number, maxAbs: number): string {
  if (maxAbs <= 0) return "";
  const intensity = Math.min(1, Math.abs(value) / maxAbs);
  if (value > 0) return `rgba(34, 197, 94, ${0.08 + intensity * 0.35})`;
  if (value < 0) return `rgba(239, 68, 68, ${0.08 + intensity * 0.35})`;
  return "";
}

function SourceBadge({ source, stale }: { source?: string; stale?: boolean }) {
  if (!source) return null;
  return (
    <span
      data-testid="options-calc-source-badge"
      className="rounded bg-[var(--edge-bg-secondary)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]"
    >
      {source}
      {stale ? " · stale" : ""}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-0.5 text-[10px] text-[var(--edge-negative)]" role="alert">
      {message}
    </p>
  );
}

function newLegId(): string {
  return `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function legsFromSeed(seedLeg: RiskCalculatorSeedLeg | null | undefined): StrategyLegInput[] {
  if (!seedLeg) return [];
  return [
    {
      ...legFromContract(seedLeg.contract, seedLeg.action ?? "buy", seedLeg.quantity ?? 1),
      id: newLegId(),
    },
  ];
}

function resolveLegOnChain(
  leg: StrategyLegInput,
  chainContracts: OptionContractSnapshot[],
  spot: number | null,
): StrategyLegInput {
  const expiration = leg.expiration;
  const strike =
    nearestChainStrike(chainContracts, {
      type: leg.type,
      expiration,
      spot: spot ?? undefined,
      strike: leg.strike,
    }) ?? leg.strike;
  const contract = findContractForLeg(chainContracts, {
    type: leg.type,
    expiration,
    strike,
  });
  return {
    ...leg,
    expiration,
    strike,
    contractSymbol: contract?.contractSymbol ?? leg.contractSymbol,
    impliedVolatility: contract?.impliedVolatility ?? leg.impliedVolatility ?? null,
  };
}

function createDefaultLeg(
  chainContracts: OptionContractSnapshot[],
  expiration: string,
  spot: number | null,
): StrategyLegInput | null {
  const strike = nearestChainStrike(chainContracts, {
    type: "call",
    expiration,
    spot: spot ?? undefined,
  });
  if (strike == null) return null;
  const contract = findContractForLeg(chainContracts, {
    type: "call",
    expiration,
    strike,
  });
  if (!contract) return null;
  return {
    ...legFromContract(contract, "buy", 1),
    id: newLegId(),
  };
}

export function OptionsRiskCalculator({
  model,
  dollarRisk,
  basisStale,
  seedLeg,
  onSeedConsumed,
  onDone,
}: Props) {
  const spotPrice = model.spotPrice;
  const [maxRisk, setMaxRisk] = useState(() => {
    if (dollarRisk == null) return "";
    return String(dollarRisk);
  });
  const [entryPriceMode, setEntryPriceMode] = useState<EntryPriceMode>("mid");
  const [exitPriceMode, setExitPriceMode] = useState<ExitPriceMode>("bid");
  const [ivScenario, setIvScenario] = useState<IvScenario>("unchanged");
  const [manualContracts, setManualContracts] = useState("");
  const [legs, setLegs] = useState<StrategyLegInput[]>(() => legsFromSeed(seedLeg));
  const [selectedCell, setSelectedCell] = useState<PayoffCell | null>(null);
  const [initializedDefaults, setInitializedDefaults] = useState(false);

  useEffect(() => {
    if (initializedDefaults) return;
    if (dollarRisk != null) setMaxRisk(String(dollarRisk));
    setInitializedDefaults(true);
  }, [initializedDefaults, dollarRisk]);

  useLayoutEffect(() => {
    if (!seedLeg) return;
    if (model.primaryExpiration !== seedLeg.contract.expiration) {
      model.selectExpiration(seedLeg.contract.expiration);
    }
    setLegs(legsFromSeed(seedLeg));
    onSeedConsumed?.();
  }, [seedLeg, model.primaryExpiration, model.selectExpiration, onSeedConsumed]);

  useEffect(() => {
    if (model.chainContracts.length === 0 || legs.length === 0) return;
    setLegs((current) =>
      current.map((leg) => resolveLegOnChain(leg, model.chainContracts, spotPrice)),
    );
  }, [model.chainContracts, spotPrice]); // eslint-disable-line react-hooks/exhaustive-deps -- re-resolve when chain loads

  const chainReady =
    !model.expLoading && !model.chainLoading && model.chainContracts.length > 0;

  const contractsByKey = useMemo(() => {
    const map = buildContractMap(model.chainContracts);
    if (seedLeg?.contract) {
      map.set(contractMapKey(seedLeg.contract), seedLeg.contract);
    }
    return map;
  }, [model.chainContracts, seedLeg]);

  const parsedMaxRisk = Number.parseFloat(maxRisk);
  const parsedManualContracts = manualContracts.trim()
    ? Number.parseInt(manualContracts, 10)
    : undefined;

  const evaluation = useMemo(() => {
    if (spotPrice == null || legs.length === 0 || !Number.isFinite(parsedMaxRisk)) {
      return null;
    }
    return validateAndEvaluateStrategy({
      inputs: {
        symbol: model.symbol ?? "",
        spotPrice,
        maxRisk: parsedMaxRisk,
        legs,
        entryPriceMode,
        exitPriceMode,
        ivScenario,
        manualContracts: parsedManualContracts,
      },
      contractsByKey,
    });
  }, [
    spotPrice,
    legs,
    parsedMaxRisk,
    model.symbol,
    entryPriceMode,
    exitPriceMode,
    ivScenario,
    parsedManualContracts,
    contractsByKey,
  ]);

  const autoSizingActive = evaluation?.summary?.sizingMode === "auto";
  const manualContractsRequired =
    legs.length > 0 &&
    (evaluation == null ||
      evaluation.softIssues.some((issue) => issue.field === "maxRisk" && issue.severity === "soft"));

  const maxAbsPnl = useMemo(() => {
    if (!evaluation?.grid) return 0;
    let max = 0;
    for (const row of evaluation.grid.cells) {
      for (const cell of row) {
        max = Math.max(max, Math.abs(cell.netPnl));
      }
    }
    return max;
  }, [evaluation?.grid]);

  const handleAddLeg = useCallback(() => {
    const expiration = model.primaryExpiration ?? model.expirations[0] ?? "";
    const leg = createDefaultLeg(model.chainContracts, expiration, spotPrice);
    if (!leg) return;
    setLegs((current) => [...current, leg]);
  }, [model.primaryExpiration, model.expirations, model.chainContracts, spotPrice]);

  const handleRemoveLeg = useCallback((id: string) => {
    setLegs((current) => current.filter((leg) => leg.id !== id));
  }, []);

  const handleLegChange = useCallback(
    (id: string, patch: Partial<StrategyLegInput>) => {
      setLegs((current) =>
        current.map((leg) => {
          if (leg.id !== id) return leg;
          const next = { ...leg, ...patch };
          return resolveLegOnChain(next, model.chainContracts, spotPrice);
        }),
      );
    },
    [model.chainContracts, spotPrice],
  );

  const handleDrawRiskRuler = useCallback(() => {
    if (!evaluation?.ok || !evaluation.inputs || evaluation.legs.length === 0) return;
    const primaryLeg = evaluation.legs[0];
    if (!primaryLeg) return;
    const breakeven = evaluation.summary?.breakevens[0] ?? spotPrice ?? primaryLeg.strike;
    const stop = spotPrice != null ? Math.max(1, spotPrice * 0.95) : primaryLeg.strike * 0.95;
    model.addRiskRulerFromCalc({
      direction: primaryLeg.type === "call" ? "bullish" : "bearish",
      spotPrice: evaluation.inputs.spotPrice,
      symbol: evaluation.inputs.symbol,
      strike: primaryLeg.strike,
      premium: primaryLeg.entryPremium,
      stop,
      target: breakeven,
      expiration: primaryLeg.expiration,
    });
  }, [evaluation, model, spotPrice]);

  if (spotPrice == null) {
    return (
      <div className="p-4 text-xs text-[var(--edge-text-secondary)]">
        Load a symbol with a spot price to use the risk calculator.
      </div>
    );
  }

  const hardIssues = evaluation?.hardIssues ?? [];
  const softIssues = evaluation?.softIssues ?? [];

  return (
    <div
      data-testid="options-risk-calculator"
      className="flex min-h-0 flex-1 flex-col overflow-hidden p-3"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-[var(--edge-text-strong)]">
          Risk Calculator
        </div>
        <SourceBadge source={model.chainMeta?.source} stale={model.chainMeta?.stale} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          {model.expLoading || model.chainLoading ? (
            <div
              data-testid="options-calc-chain-loading"
              className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2 text-xs text-[var(--edge-text-secondary)]"
              role="status"
            >
              Loading options chain
              {model.primaryExpiration ? ` for ${model.primaryExpiration}` : ""}…
            </div>
          ) : null}
          {model.chainError ? (
            <div
              data-testid="options-calc-chain-error"
              className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2 text-xs text-[var(--edge-negative)]"
              role="alert"
            >
              {model.chainError}. Switch to Chain tab or pick another expiration.
            </div>
          ) : null}

          <div className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                  Symbol
                </div>
                <div data-testid="options-calc-symbol">{model.symbol}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                  Spot
                </div>
                <div data-testid="options-calc-spot">{spotPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-[var(--edge-text-secondary)]">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                Max risk $
              </span>
              <input
                type="number"
                min={1}
                value={maxRisk}
                onChange={(event) => setMaxRisk(event.target.value)}
                className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
                data-testid="options-calc-max-risk"
              />
              {autoSizingActive && evaluation?.summary ? (
                <p
                  data-testid="options-calc-auto-contracts"
                  className="mt-0.5 text-[10px] font-medium text-[var(--edge-text-strong)]"
                >
                  Auto: {evaluation.summary.contracts} contracts
                </p>
              ) : null}
              {basisStale ? (
                <p
                  className="mt-0.5 text-[10px] text-[var(--edge-text-secondary)]"
                  data-testid="options-calc-stale-hint"
                >
                  Account basis stale — using last resolved risk. Connect account or set risk in
                  Risk panel.
                </p>
              ) : dollarRisk == null ? (
                <p className="mt-0.5 text-[10px] text-[var(--edge-text-secondary)]">
                  Set risk in the Risk sidebar panel or enter max risk manually.
                </p>
              ) : null}
            </label>
            {!autoSizingActive ? (
              <label className="text-xs text-[var(--edge-text-secondary)]">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                  Contracts {manualContractsRequired ? "" : "(optional)"}
                </span>
                <input
                  type="number"
                  min={1}
                  placeholder="Auto"
                  value={manualContracts}
                  onChange={(event) => setManualContracts(event.target.value)}
                  className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
                  data-testid="options-calc-manual-contracts"
                />
              </label>
            ) : (
              <div className="text-xs text-[var(--edge-text-secondary)]">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                  Contracts
                </span>
                <div
                  className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-[10px]"
                  data-testid="options-calc-auto-contracts-readonly"
                >
                  Sized from max risk
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-[var(--edge-text-secondary)]">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                Entry
              </span>
              <select
                value={entryPriceMode}
                onChange={(event) => setEntryPriceMode(event.target.value as EntryPriceMode)}
                className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
                data-testid="options-calc-entry-mode"
              >
                <option value="mid">Mid</option>
                <option value="ask">Ask</option>
                <option value="bid">Bid</option>
                <option value="last">Last</option>
              </select>
            </label>
            <label className="text-xs text-[var(--edge-text-secondary)]">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                Exit
              </span>
              <select
                value={exitPriceMode}
                onChange={(event) => setExitPriceMode(event.target.value as ExitPriceMode)}
                className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
                data-testid="options-calc-exit-mode"
              >
                <option value="bid">Bid</option>
                <option value="mid">Mid</option>
              </select>
            </label>
            <label className="text-xs text-[var(--edge-text-secondary)]">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                IV
              </span>
              <select
                value={ivScenario}
                onChange={(event) => setIvScenario(event.target.value as IvScenario)}
                className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
                data-testid="options-calc-iv-scenario"
              >
                <option value="down">Down</option>
                <option value="unchanged">Unchanged</option>
                <option value="up">Up</option>
              </select>
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--edge-text-strong)]">
                Legs
              </div>
              <EdgeButton
                type="button"
                data-testid="options-calc-add-leg"
                onClick={handleAddLeg}
                disabled={!chainReady}
              >
                + Add leg
              </EdgeButton>
            </div>
            {!chainReady && !model.chainLoading && !model.expLoading ? (
              <p
                data-testid="options-calc-chain-empty"
                className="mb-2 text-[10px] text-[var(--edge-text-secondary)]"
              >
                Load the chain on the Chain tab before adding legs.
              </p>
            ) : null}
            {legs.length === 0 ? (
              <p className="text-[10px] text-[var(--edge-text-secondary)]">
                Add a leg or analyze a chain row to begin.
              </p>
            ) : (
              <div className="space-y-2">
                {legs.map((leg) => {
                  const strikeOptions = listStrikesForLeg(model.chainContracts, {
                    type: leg.type,
                    expiration: leg.expiration,
                  });
                  const contract = findContractForLeg(model.chainContracts, {
                    type: leg.type,
                    expiration: leg.expiration,
                    strike: leg.strike,
                  });
                  const entryPremium = resolveEntryPremium(contract, entryPriceMode);
                  return (
                  <div
                    key={leg.id}
                    data-testid={`options-calc-leg-${leg.id}`}
                    className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-2 text-[10px]"
                  >
                    <div className="mb-1 grid grid-cols-4 gap-1 text-[9px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                      <span>Action</span>
                      <span>Type</span>
                      <span>Strike</span>
                      <span>Ratio</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <select
                        value={leg.action}
                        onChange={(event) =>
                          handleLegChange(leg.id, {
                            action: event.target.value as "buy" | "sell",
                          })
                        }
                        className="rounded border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)] px-1 py-0.5"
                      >
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                      <select
                        value={leg.type}
                        onChange={(event) =>
                          handleLegChange(leg.id, {
                            type: event.target.value as "call" | "put",
                          })
                        }
                        className="rounded border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)] px-1 py-0.5"
                      >
                        <option value="call">Call</option>
                        <option value="put">Put</option>
                      </select>
                      <select
                        value={leg.strike}
                        data-testid={`options-calc-strike-${leg.id}`}
                        onChange={(event) =>
                          handleLegChange(leg.id, {
                            strike: Number.parseFloat(event.target.value),
                          })
                        }
                        className="rounded border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)] px-1 py-0.5"
                      >
                        {strikeOptions.length > 0 ? (
                          strikeOptions.map((strike) => (
                            <option key={strike} value={strike}>
                              {strike}
                            </option>
                          ))
                        ) : (
                          <option value={leg.strike}>{leg.strike}</option>
                        )}
                      </select>
                      <input
                        type="number"
                        min={1}
                        aria-label="Leg ratio"
                        value={leg.quantity}
                        onChange={(event) =>
                          handleLegChange(leg.id, {
                            quantity: Number.parseInt(event.target.value, 10) || 1,
                          })
                        }
                        className="rounded border border-[var(--edge-border)] bg-[var(--edge-bg-secondary)] px-1 py-0.5"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[var(--edge-text-secondary)]">
                        {leg.expiration}
                        {entryPremium != null ? ` · entry ${entryPremium.toFixed(2)}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLeg(leg.id)}
                        className="text-[var(--edge-negative)] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {hardIssues.map((issue) => (
            <FieldError key={`${issue.field}-${issue.message}`} message={issue.message} />
          ))}
          {softIssues.map((issue) => (
            <p
              key={`${issue.field}-${issue.message}`}
              className="text-[10px] text-[var(--edge-text-secondary)]"
              role="status"
            >
              {issue.message}
            </p>
          ))}

          {evaluation?.summary ? (
            <div
              data-testid="options-calc-summary"
              className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2 text-xs"
            >
              <div>
                Contracts: {evaluation.summary.contracts} · Cost: $
                {formatMoney(evaluation.summary.totalCost)}
              </div>
              <div>
                Max loss:{" "}
                {evaluation.summary.maxLoss != null
                  ? `$${formatMoney(evaluation.summary.maxLoss)}`
                  : "—"}
              </div>
              <div>
                Max profit:{" "}
                {evaluation.summary.maxProfit != null
                  ? `$${formatMoney(evaluation.summary.maxProfit)}`
                  : "—"}
              </div>
              <div>
                Breakeven:{" "}
                {evaluation.summary.breakevens.length > 0
                  ? evaluation.summary.breakevens.map((value) => value.toFixed(2)).join(", ")
                  : "—"}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {evaluation?.grid ? (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <table
                  data-testid="options-calc-payoff-grid"
                  className="w-full border-collapse text-[10px]"
                >
                  <thead className="sticky top-0 bg-[var(--edge-surface-popover)]">
                    <tr>
                      <th className="px-1 py-1 text-left">Price</th>
                      {evaluation.grid.exitDates.map((date) => (
                        <th key={date} className="px-1 py-1 text-right">
                          {date === evaluation.grid?.exitDates.at(-1) ? `${date} (exp)` : date}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation.grid.underlyingPrices.map((price, rowIndex) => (
                      <tr key={price} data-testid={`options-calc-payoff-row-${price}`}>
                        <td className="px-1 py-1 font-medium tabular-nums">{price.toFixed(2)}</td>
                        {evaluation.grid!.cells[rowIndex]?.map((cell) => (
                          <td
                            key={`${price}-${cell.exitDate}`}
                            className={`cursor-pointer px-1 py-1 text-right tabular-nums ${pnlClass(cell.netPnl)}`}
                            style={{ backgroundColor: heatClass(cell.netPnl, maxAbsPnl) }}
                            onClick={() => setSelectedCell(cell)}
                          >
                            {cell.netPnl >= 0 ? "+" : ""}
                            {formatMoney(cell.netPnl)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                data-testid="options-calc-scenario-detail"
                className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2 text-xs"
              >
                {selectedCell ? (
                  <>
                    <div className="font-semibold text-[var(--edge-text-strong)]">
                      {selectedCell.isExpiration ? "At expiration" : "Before expiration"} · $
                      {selectedCell.underlyingPrice.toFixed(2)} · {selectedCell.exitDate}
                    </div>
                    <div className="mt-1">
                      Value: ${formatMoney(selectedCell.strategyValue)} · P/L:{" "}
                      <span className={pnlClass(selectedCell.netPnl)}>
                        {selectedCell.netPnl >= 0 ? "+" : ""}${formatMoney(selectedCell.netPnl)}
                      </span>{" "}
                      · Return: {selectedCell.returnPct.toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <div className="text-[var(--edge-text-secondary)]">
                    Click a payoff cell to inspect scenario details.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-6 text-xs text-[var(--edge-text-secondary)]">
              Configure legs and max risk to generate the payoff surface.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <EdgeButton
              type="button"
              variant="primary"
              data-testid="options-calc-draw-ruler"
              disabled={!evaluation?.ok}
              onClick={handleDrawRiskRuler}
            >
              Draw risk ruler
            </EdgeButton>
            {onDone ? (
              <EdgeButton type="button" data-testid="options-calc-done" onClick={onDone}>
                Done
              </EdgeButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
