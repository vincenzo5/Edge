"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { EdgeButton, EdgeSelect } from "@/app/components/design-system";
import { fieldClass } from "@/app/components/design-system/styles";
import { useWatchlistActions } from "@/app/components/watchlist/WatchlistContext";
import {
  ALERT_CONDITION_COMBINATORS,
  ALERT_INDICATOR_COMPARE_OPS,
  ALERT_INDICATOR_INTERVALS,
  ALERT_INDICATOR_NAMES,
  ALERT_OPERATORS,
  ALERT_RECURRENCE,
  type AlertCondition,
  type AlertConditionCombinator,
  type AlertDefinitionResponse,
  type AlertDrawingKind,
  type AlertIndicatorInterval,
  type AlertIndicatorName,
  type AlertOperator,
  type AlertRecurrence,
} from "@/lib/persistence/schemas/alerts";
import {
  ALERT_INDICATOR_CATALOG,
  buildPriceCondition,
} from "@/lib/alerts/alertConditions";
import {
  createAlert,
  patchAlert,
  removeAlert,
} from "@/lib/alerts/alertClient";
import { drawingKindLabel } from "@/lib/alerts/drawingAlertGeometry";
import { defaultAlertMessage, formatAlertOperatorLabel } from "@/lib/alerts/evaluateAlerts";
import { tradePlanRoleLabel } from "@/lib/alerts/tradePlanAlerts";
import type { AlertDrawingRole } from "@/lib/persistence/schemas/alerts";

export type AlertDraft = {
  symbol: string;
  operator: AlertOperator;
  price: number;
  message?: string;
  drawingId?: string;
  drawingKind?: AlertDrawingKind;
  priceHigh?: number;
  tlT0?: number;
  tlV0?: number;
  tlT1?: number;
  tlV1?: number;
  tlExtendLeft?: boolean;
  tlExtendRight?: boolean;
  scriptId?: string;
  revision?: string;
  conditionId?: string;
  scriptTitle?: string;
};

type Props = {
  alert: AlertDefinitionResponse | null;
  draft?: AlertDraft | null;
  onSaved: (alert: AlertDefinitionResponse) => void;
  onDeleted: (alertId: string) => void;
};

type ScopeMode = "symbol" | "watchlist";
type LegKind = "price" | "indicator";
type IndicatorMode = "level" | "cross";

type PriceLegState = {
  kind: "price";
  operator: AlertOperator;
  price: string;
};

type IndicatorLegState = {
  kind: "indicator";
  mode: IndicatorMode;
  indicator: AlertIndicatorName;
  interval: AlertIndicatorInterval;
  period: string;
  fast: string;
  slow: string;
  signal: string;
  series: string;
  op: (typeof ALERT_INDICATOR_COMPARE_OPS)[number];
  threshold: string;
  seriesA: string;
  seriesB: string;
  direction: "above" | "below";
};

type ScriptLegState = {
  kind: "script";
  scriptId: string;
  revision: string;
  conditionId: string;
  title: string;
};

type LegState = PriceLegState | IndicatorLegState | ScriptLegState;

const inputClass = fieldClass({ density: "compact" });
const labelClass = "text-xs text-[var(--edge-text-secondary)]";

const recurrenceOptions = ALERT_RECURRENCE.map((recurrence) => ({
  value: recurrence,
  label: recurrence === "once" ? "Once" : "Every time (cooldown)",
}));

const scopeOptions = [
  { value: "symbol", label: "Symbol" },
  { value: "watchlist", label: "Watchlist" },
];

const legKindOptions = [
  { value: "price", label: "Price" },
  { value: "indicator", label: "Indicator" },
];

const combinatorOptions = ALERT_CONDITION_COMBINATORS.map((value) => ({
  value,
  label: value.toUpperCase(),
}));

const indicatorOptions = ALERT_INDICATOR_NAMES.map((value) => ({ value, label: value }));
const intervalOptions = ALERT_INDICATOR_INTERVALS.map((value) => ({ value, label: value }));
const compareOpOptions = ALERT_INDICATOR_COMPARE_OPS.map((value) => ({ value, label: value }));
const indicatorModeOptions = [
  { value: "level", label: "Level" },
  { value: "cross", label: "Cross" },
];
const directionOptions = [
  { value: "above", label: "Crosses above" },
  { value: "below", label: "Crosses below" },
];

function operatorOptionsForDrawing(drawingKind?: AlertDrawingKind | null) {
  if (drawingKind === "rectangle") {
    return ALERT_OPERATORS.filter(
      (operator) => operator === "enter_zone" || operator === "exit_zone",
    ).map((operator) => ({
      value: operator,
      label: formatAlertOperatorLabel(operator),
    }));
  }
  return ALERT_OPERATORS.filter(
    (operator) => operator !== "enter_zone" && operator !== "exit_zone",
  ).map((operator) => ({
    value: operator,
    label: formatAlertOperatorLabel(operator),
  }));
}

function defaultIndicatorLeg(indicator: AlertIndicatorName = "RSI"): IndicatorLegState {
  const catalog = ALERT_INDICATOR_CATALOG[indicator];
  return {
    kind: "indicator",
    mode: catalog.crossPairs.length > 0 ? "cross" : "level",
    indicator,
    interval: "1d",
    period: String(catalog.defaultInputs.period ?? 14),
    fast: String(catalog.defaultInputs.fast ?? 12),
    slow: String(catalog.defaultInputs.slow ?? 26),
    signal: String(catalog.defaultInputs.signal ?? 9),
    series: catalog.levelSeries[0] ?? "rsi",
    op: ">",
    threshold: indicator === "RSI" ? "70" : "0",
    seriesA: catalog.crossPairs[0]?.seriesA ?? "macd",
    seriesB: catalog.crossPairs[0]?.seriesB ?? "signal",
    direction: "above",
  };
}

function defaultScriptLeg(input: {
  scriptId: string;
  revision: string;
  conditionId: string;
  title?: string;
}): ScriptLegState {
  return {
    kind: "script",
    scriptId: input.scriptId,
    revision: input.revision,
    conditionId: input.conditionId,
    title: input.title?.trim() ?? input.conditionId,
  };
}

function defaultPriceLeg(price = "", operator: AlertOperator = "cross_above"): PriceLegState {
  return { kind: "price", operator, price };
}

function legFromCondition(
  condition: AlertCondition,
  fallbackPrice = "",
  fallbackOperator: AlertOperator = "cross_above",
): LegState {
  if (condition.kind === "price") {
    return {
      kind: "price",
      operator: condition.operator,
      price: String(condition.price),
    };
  }
  if (condition.kind === "indicator_level") {
    return {
      ...defaultIndicatorLeg(condition.indicator),
      mode: "level",
      indicator: condition.indicator,
      interval: condition.interval,
      period: String(condition.inputs?.period ?? ALERT_INDICATOR_CATALOG[condition.indicator].defaultInputs.period ?? 14),
      fast: String(condition.inputs?.fast ?? 12),
      slow: String(condition.inputs?.slow ?? 26),
      signal: String(condition.inputs?.signal ?? 9),
      series: condition.series,
      op: condition.op,
      threshold: String(condition.threshold),
    };
  }
  if (condition.kind === "script_condition") {
    return defaultScriptLeg({
      scriptId: condition.scriptId,
      revision: condition.revision,
      conditionId: condition.conditionId,
      title: condition.title,
    });
  }
  return {
    ...defaultIndicatorLeg(condition.indicator),
    mode: "cross",
    indicator: condition.indicator,
    interval: condition.interval,
    period: String(condition.inputs?.period ?? 14),
    fast: String(condition.inputs?.fast ?? 12),
    slow: String(condition.inputs?.slow ?? 26),
    signal: String(condition.inputs?.signal ?? 9),
    seriesA: condition.seriesA,
    seriesB: condition.seriesB,
    direction: condition.direction,
  };
}

function buildIndicatorInputs(leg: IndicatorLegState): Record<string, number> {
  if (leg.indicator === "MACD") {
    return {
      fast: Number(leg.fast),
      slow: Number(leg.slow),
      signal: Number(leg.signal),
    };
  }
  return { period: Number(leg.period) };
}

function legToCondition(
  leg: LegState,
  drawingKind: AlertDrawingKind | null,
  parsedPrice: number,
  priceHigh: number | null,
): AlertCondition | null {
  if (leg.kind === "script") {
    return {
      kind: "script_condition",
      scriptId: leg.scriptId,
      revision: leg.revision,
      conditionId: leg.conditionId,
      title: leg.title.trim() || leg.conditionId,
    };
  }
  if (leg.kind === "price") {
    const price = parsedPrice;
    if (!Number.isFinite(price)) return null;
    return buildPriceCondition({
      operator: leg.operator,
      price,
      priceHigh: drawingKind === "rectangle" ? priceHigh : null,
    });
  }

  const inputs = buildIndicatorInputs(leg);
  if (leg.mode === "cross") {
    return {
      kind: "indicator_cross",
      indicator: leg.indicator,
      inputs,
      interval: leg.interval,
      seriesA: leg.seriesA,
      seriesB: leg.seriesB,
      direction: leg.direction,
    };
  }

  const threshold = Number(leg.threshold);
  if (!Number.isFinite(threshold)) return null;
  return {
    kind: "indicator_level",
    indicator: leg.indicator,
    inputs,
    interval: leg.interval,
    series: leg.series,
    op: leg.op,
    threshold,
  };
}

function ConditionLegEditor({
  title,
  leg,
  setLeg,
  drawingKind,
  readOnlyPrice,
  scriptLocked = false,
}: {
  title: string;
  leg: LegState;
  setLeg: (leg: LegState) => void;
  drawingKind: AlertDrawingKind | null;
  readOnlyPrice: boolean;
  scriptLocked?: boolean;
}) {
  const catalog =
    leg.kind === "indicator" ? ALERT_INDICATOR_CATALOG[leg.indicator] : null;
  const operatorOptions = operatorOptionsForDrawing(drawingKind);

  if (leg.kind === "script") {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] p-3">
        <p className="text-xs font-medium text-[var(--edge-text-primary)]">{title}</p>
        <p className="text-xs text-[var(--edge-text-secondary)]">
          Script condition · {leg.scriptId} · {leg.title}
        </p>
        <p className="text-xs text-[var(--edge-text-muted)]">
          Evaluated on the chart while this symbol is open; server fires when the condition turns true.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] p-3">
      <p className="text-xs font-medium text-[var(--edge-text-primary)]">{title}</p>
      {!scriptLocked ? (
      <div>
        <label className={labelClass}>Type</label>
        <EdgeSelect
          testId={`${title}-leg-kind`}
          aria-label={`${title} type`}
          value={leg.kind}
          onChange={(value) => {
            if (value === "price") setLeg(defaultPriceLeg());
            else setLeg(defaultIndicatorLeg());
          }}
          options={legKindOptions}
        />
      </div>
      ) : null}

      {leg.kind === "price" ? (
        <>
          <div>
            <label className={labelClass}>Condition</label>
            <EdgeSelect
              testId={`${title}-operator`}
              aria-label={`${title} condition`}
              value={leg.operator}
              onChange={(value) =>
                setLeg({ ...leg, operator: value as AlertOperator })
              }
              options={operatorOptions}
            />
          </div>
          <div>
            <label className={labelClass}>
              {drawingKind === "rectangle" ? "Zone low" : "Price"}
            </label>
            <input
              className={inputClass}
              inputMode="decimal"
              value={leg.price}
              readOnly={readOnlyPrice}
              onChange={(event) => setLeg({ ...leg, price: event.target.value })}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={labelClass}>Indicator</label>
            <EdgeSelect
              testId={`${title}-indicator`}
              aria-label={`${title} indicator`}
              value={leg.indicator}
              onChange={(value) => setLeg(defaultIndicatorLeg(value as AlertIndicatorName))}
              options={indicatorOptions}
            />
          </div>
          <div>
            <label className={labelClass}>Interval</label>
            <EdgeSelect
              testId={`${title}-interval`}
              aria-label={`${title} interval`}
              value={leg.interval}
              onChange={(value) =>
                setLeg({ ...leg, interval: value as AlertIndicatorInterval })
              }
              options={intervalOptions}
            />
          </div>
          {leg.indicator === "MACD" ? (
            <div className="grid grid-cols-3 gap-2">
              {(["fast", "slow", "signal"] as const).map((field) => (
                <div key={field}>
                  <label className={labelClass}>{field}</label>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={leg[field]}
                    onChange={(event) => setLeg({ ...leg, [field]: event.target.value })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className={labelClass}>Period</label>
              <input
                className={inputClass}
                inputMode="numeric"
                value={leg.period}
                onChange={(event) => setLeg({ ...leg, period: event.target.value })}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Mode</label>
            <EdgeSelect
              testId={`${title}-indicator-mode`}
              aria-label={`${title} indicator mode`}
              value={leg.mode}
              onChange={(value) =>
                setLeg({
                  ...leg,
                  mode: value as IndicatorMode,
                  series: catalog?.levelSeries[0] ?? leg.series,
                })
              }
              options={
                catalog?.crossPairs.length
                  ? indicatorModeOptions
                  : indicatorModeOptions.filter((option) => option.value === "level")
              }
            />
          </div>
          {leg.mode === "level" ? (
            <>
              <div>
                <label className={labelClass}>Series</label>
                <EdgeSelect
                  testId={`${title}-series`}
                  aria-label={`${title} series`}
                  value={leg.series}
                  onChange={(value) => setLeg({ ...leg, series: value })}
                  options={(catalog?.levelSeries ?? []).map((value) => ({ value, label: value }))}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                <div>
                  <label className={labelClass}>Compare</label>
                  <EdgeSelect
                    testId={`${title}-compare-op`}
                    aria-label={`${title} compare`}
                    value={leg.op}
                    onChange={(value) =>
                      setLeg({ ...leg, op: value as IndicatorLegState["op"] })
                    }
                    options={compareOpOptions}
                  />
                </div>
                <div>
                  <label className={labelClass}>Threshold</label>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={leg.threshold}
                    onChange={(event) => setLeg({ ...leg, threshold: event.target.value })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Cross</label>
                <EdgeSelect
                  testId={`${title}-cross-direction`}
                  aria-label={`${title} cross direction`}
                  value={leg.direction}
                  onChange={(value) =>
                    setLeg({ ...leg, direction: value as "above" | "below" })
                  }
                  options={directionOptions}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Series A</label>
                  <EdgeSelect
                    testId={`${title}-series-a`}
                    aria-label={`${title} series A`}
                    value={leg.seriesA}
                    onChange={(value) => setLeg({ ...leg, seriesA: value })}
                    options={(catalog?.levelSeries ?? []).map((value) => ({ value, label: value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Series B</label>
                  <EdgeSelect
                    testId={`${title}-series-b`}
                    aria-label={`${title} series B`}
                    value={leg.seriesB}
                    onChange={(value) => setLeg({ ...leg, seriesB: value })}
                    options={(catalog?.levelSeries ?? []).map((value) => ({ value, label: value }))}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function AlertsConfigPane({
  alert,
  draft,
  onSaved,
  onDeleted,
}: Props) {
  const watchlist = useWatchlistActions();
  const [scopeMode, setScopeMode] = useState<ScopeMode>("symbol");
  const [symbol, setSymbol] = useState("");
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [leg1, setLeg1] = useState<LegState>(defaultPriceLeg());
  const [leg2, setLeg2] = useState<LegState>(defaultPriceLeg("", "touch_below"));
  const [secondLegEnabled, setSecondLegEnabled] = useState(false);
  const [combinator, setCombinator] = useState<AlertConditionCombinator>("and");
  const [message, setMessage] = useState("");
  const [recurrence, setRecurrence] = useState<AlertRecurrence>("once");
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [drawingKind, setDrawingKind] = useState<AlertDrawingKind | null>(null);
  const [priceHigh, setPriceHigh] = useState<number | null>(null);
  const [tlT0, setTlT0] = useState<number | null>(null);
  const [tlV0, setTlV0] = useState<number | null>(null);
  const [tlT1, setTlT1] = useState<number | null>(null);
  const [tlV1, setTlV1] = useState<number | null>(null);
  const [tlExtendLeft, setTlExtendLeft] = useState<boolean | null>(null);
  const [tlExtendRight, setTlExtendRight] = useState<boolean | null>(null);
  const [drawingRole, setDrawingRole] = useState<AlertDrawingRole | null>(null);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawingBound = Boolean(drawingId || drawingKind);
  const watchlistOptions = useMemo(
    () =>
      (watchlist?.state.watchlists ?? []).map((list) => ({
        value: list.id,
        label: `${list.name} (${list.items.length})`,
      })),
    [watchlist?.state.watchlists],
  );

  useEffect(() => {
    if (alert) {
      setScopeMode(alert.watchlistId ? "watchlist" : "symbol");
      setSymbol(alert.symbol === "*" ? "" : alert.symbol);
      setWatchlistId(alert.watchlistId ?? null);
      setLeg1(legFromCondition(alert.conditions[0]!, String(alert.price), alert.operator));
      setLeg2(
        alert.conditions[1]
          ? legFromCondition(alert.conditions[1], "", "touch_below")
          : defaultPriceLeg("", "touch_below"),
      );
      setSecondLegEnabled(alert.conditions.length > 1);
      setCombinator(alert.combinator ?? "and");
      setMessage(alert.message ?? "");
      setRecurrence(alert.recurrence);
      setDrawingId(alert.drawingId ?? null);
      setDrawingKind(alert.drawingKind ?? null);
      setPriceHigh(alert.priceHigh ?? null);
      setTlT0(alert.tlT0 ?? null);
      setTlV0(alert.tlV0 ?? null);
      setTlT1(alert.tlT1 ?? null);
      setTlV1(alert.tlV1 ?? null);
      setTlExtendLeft(alert.tlExtendLeft ?? null);
      setTlExtendRight(alert.tlExtendRight ?? null);
      setDrawingRole(alert.drawingRole ?? null);
      setBundleId(alert.bundleId ?? null);
      setError(null);
      return;
    }

    if (draft) {
      setScopeMode("symbol");
      setSymbol(draft.symbol ?? "");
      setWatchlistId(null);
      if (draft.scriptId && draft.revision && draft.conditionId) {
        setLeg1(
          defaultScriptLeg({
            scriptId: draft.scriptId,
            revision: draft.revision,
            conditionId: draft.conditionId,
            title: draft.scriptTitle,
          }),
        );
      } else {
        setLeg1(defaultPriceLeg(String(draft.price ?? ""), draft.operator ?? "cross_above"));
      }
      setLeg2(defaultPriceLeg("", "touch_below"));
      setSecondLegEnabled(false);
      setCombinator("and");
      setMessage(draft.message ?? "");
      setRecurrence("once");
      setDrawingId(draft.drawingId ?? null);
      setDrawingKind(draft.drawingKind ?? null);
      setPriceHigh(draft.priceHigh ?? null);
      setTlT0(draft.tlT0 ?? null);
      setTlV0(draft.tlV0 ?? null);
      setTlT1(draft.tlT1 ?? null);
      setTlV1(draft.tlV1 ?? null);
      setTlExtendLeft(draft.tlExtendLeft ?? null);
      setTlExtendRight(draft.tlExtendRight ?? null);
      setDrawingRole(null);
      setBundleId(null);
      setError(null);
      return;
    }

    setScopeMode("symbol");
    setSymbol("");
    setWatchlistId(null);
    setLeg1(defaultPriceLeg());
    setLeg2(defaultPriceLeg("", "touch_below"));
    setSecondLegEnabled(false);
    setCombinator("and");
    setMessage("");
    setRecurrence("once");
    setDrawingId(null);
    setDrawingKind(null);
    setPriceHigh(null);
    setTlT0(null);
    setTlV0(null);
    setTlT1(null);
    setTlV1(null);
    setTlExtendLeft(null);
    setTlExtendRight(null);
    setDrawingRole(null);
    setBundleId(null);
    setError(null);
  }, [alert, draft]);

  const parsedPrimaryPrice =
    leg1.kind === "price" ? Number(leg1.price) : Number(draft?.price ?? alert?.price ?? 0);
  const isValidPrimaryPrice = Number.isFinite(parsedPrimaryPrice);
  const scriptLegLocked = leg1.kind === "script";
  const canSaveConditions = scriptLegLocked || isValidPrimaryPrice;

  const buildConditions = useCallback((): AlertCondition[] | null => {
    const legs = secondLegEnabled && !drawingBound ? [leg1, leg2] : [leg1];
    const conditions: AlertCondition[] = [];
    for (const leg of legs) {
      const condition = legToCondition(leg, drawingKind, parsedPrimaryPrice, priceHigh);
      if (!condition) return null;
      conditions.push(condition);
    }
    return conditions;
  }, [drawingBound, drawingKind, leg1, leg2, parsedPrimaryPrice, priceHigh, secondLegEnabled]);

  const handleSave = useCallback(async () => {
    if (scopeMode === "symbol" && !symbol.trim()) {
      setError("Symbol is required.");
      return;
    }
    if (scopeMode === "watchlist" && !watchlistId) {
      setError("Select a watchlist.");
      return;
    }
    if (leg1.kind === "price" && !isValidPrimaryPrice) {
      setError("Enter a valid price.");
      return;
    }
    if (leg1.kind === "script" && scopeMode === "watchlist") {
      setError("Script conditions require a symbol scope.");
      return;
    }

    const conditions = buildConditions();
    if (!conditions) {
      setError("Enter valid condition values.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const trimmedSymbol = symbol.trim().toUpperCase();
      const primaryOperator =
        conditions[0]?.kind === "price" ? conditions[0].operator : ("touch_above" as AlertOperator);
      const primaryPrice =
        conditions[0]?.kind === "price" ? conditions[0].price : parsedPrimaryPrice;

      const payloadMessage =
        message.trim() ||
        defaultAlertMessage({
          symbol: scopeMode === "watchlist" ? "Watchlist" : trimmedSymbol,
          operator: primaryOperator,
          price: primaryPrice,
          priceHigh,
          drawingKind,
          alert: {
            combinator: conditions.length > 1 ? combinator : null,
            conditions,
            operator: primaryOperator,
            price: primaryPrice,
            priceHigh,
          },
        });

      const bindFields = {
        drawingId: drawingId ?? undefined,
        drawingKind: drawingKind ?? undefined,
        priceHigh,
        tlT0,
        tlV0,
        tlT1,
        tlV1,
        tlExtendLeft,
        tlExtendRight,
      };

      const sharedPayload = {
        message: payloadMessage,
        recurrence,
        combinator: conditions.length > 1 ? combinator : null,
        conditions,
        ...bindFields,
      };

      if (alert) {
        const updated = await patchAlert(alert.id, {
          ...(scopeMode === "watchlist"
            ? { watchlistId, symbol: null }
            : { symbol: trimmedSymbol, watchlistId: null }),
          operator: primaryOperator,
          price: primaryPrice,
          ...sharedPayload,
          drawingId,
          drawingKind,
        });
        if (!updated) {
          setError("Alert not found.");
          return;
        }
        onSaved(updated);
        return;
      }

      const created = await createAlert({
        ...(scopeMode === "watchlist"
          ? { watchlistId: watchlistId ?? undefined }
          : { symbol: trimmedSymbol }),
        operator: primaryOperator,
        price: primaryPrice,
        ...sharedPayload,
      });
      onSaved(created);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save alert.");
    } finally {
      setSaving(false);
    }
  }, [
    alert,
    buildConditions,
    combinator,
    drawingId,
    drawingKind,
    isValidPrimaryPrice,
    message,
    onSaved,
    parsedPrimaryPrice,
    priceHigh,
    recurrence,
    scopeMode,
    symbol,
    tlExtendLeft,
    tlExtendRight,
    tlT0,
    tlT1,
    tlV0,
    tlV1,
    watchlistId,
  ]);

  const handlePauseToggle = useCallback(async () => {
    if (!alert) return;
    const nextStatus = alert.status === "active" ? "paused" : "active";
    const updated = await patchAlert(alert.id, { status: nextStatus });
    if (updated) onSaved(updated);
  }, [alert, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!alert) return;
    const label = alert.watchlistId ? "watchlist alert" : alert.symbol;
    if (!window.confirm(`Delete alert for ${label}?`)) return;
    const ok = await removeAlert(alert.id);
    if (ok) onDeleted(alert.id);
  }, [alert, onDeleted]);

  if (!alert && !draft && !symbol && !watchlistId && leg1.kind === "price" && !leg1.price) {
    return (
      <div
        data-testid="alerts-config-empty"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="text-sm text-[var(--edge-text-secondary)]">No alert selected</p>
        <p className="text-xs text-[var(--edge-text-muted)]">
          Create a price alert or pick one from the library.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="alerts-config-pane"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
          {drawingRole ? (
            <p
              data-testid="alert-trade-plan-bind-summary"
              className="rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] px-3 py-2 text-xs text-[var(--edge-text-secondary)]"
            >
              Trade plan · {tradePlanRoleLabel(drawingRole)}
              {isValidPrimaryPrice ? ` · level ${parsedPrimaryPrice.toFixed(2)}` : ""}
              {bundleId ? ` · bundle ${bundleId.slice(0, 8)}` : ""}
            </p>
          ) : null}

          {drawingKind ? (
            <p
              data-testid="alert-drawing-bind-summary"
              className="rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] px-3 py-2 text-xs text-[var(--edge-text-secondary)]"
            >
              Bound to {drawingKindLabel(drawingKind)}
              {drawingKind === "rectangle" && priceHigh != null
                ? ` · zone ${parsedPrimaryPrice.toFixed(2)}–${priceHigh.toFixed(2)}`
                : isValidPrimaryPrice
                  ? ` · level ${parsedPrimaryPrice.toFixed(2)}`
                  : ""}
            </p>
          ) : null}

          {!drawingBound ? (
            <>
              <div>
                <label className={labelClass}>Scope</label>
                <EdgeSelect
                  testId="alert-scope-select"
                  aria-label="Alert scope"
                  value={scopeMode}
                  onChange={(value) => setScopeMode(value as ScopeMode)}
                  options={scopeOptions}
                />
              </div>

              {scopeMode === "symbol" ? (
                <div>
                  <label className={labelClass} htmlFor="alert-symbol">
                    Symbol
                  </label>
                  <input
                    id="alert-symbol"
                    data-testid="alert-symbol-input"
                    className={inputClass}
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Watchlist</label>
                  <EdgeSelect
                    testId="alert-watchlist-select"
                    aria-label="Alert watchlist"
                    value={watchlistId ?? ""}
                    onChange={(value) => setWatchlistId(value || null)}
                    options={
                      watchlistOptions.length > 0
                        ? watchlistOptions
                        : [{ value: "", label: "No watchlists" }]
                    }
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <label className={labelClass} htmlFor="alert-symbol">
                Symbol
              </label>
              <input
                id="alert-symbol"
                data-testid="alert-symbol-input"
                className={inputClass}
                value={symbol}
                readOnly
              />
            </div>
          )}

          <ConditionLegEditor
            title="Condition 1"
            leg={leg1}
            setLeg={setLeg1}
            drawingKind={drawingKind}
            readOnlyPrice={Boolean(drawingId)}
            scriptLocked={scriptLegLocked}
          />

          {!drawingBound && !scriptLegLocked ? (
            <>
              <div className="flex items-center gap-2">
                <EdgeButton
                  type="button"
                  variant="secondary"
                  data-testid="alert-toggle-second-leg"
                  onClick={() => setSecondLegEnabled((value) => !value)}
                >
                  {secondLegEnabled ? "Remove second condition" : "Add second condition"}
                </EdgeButton>
              </div>

              {secondLegEnabled ? (
                <>
                  <div>
                    <label className={labelClass}>Combine with</label>
                    <EdgeSelect
                      testId="alert-combinator-select"
                      aria-label="Alert combinator"
                      value={combinator}
                      onChange={(value) =>
                        setCombinator(value as AlertConditionCombinator)
                      }
                      options={combinatorOptions}
                    />
                  </div>
                  <ConditionLegEditor
                    title="Condition 2"
                    leg={leg2}
                    setLeg={setLeg2}
                    drawingKind={null}
                    readOnlyPrice={false}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {drawingKind === "rectangle" && priceHigh != null ? (
            <div>
              <label className={labelClass} htmlFor="alert-price-high">
                Zone high
              </label>
              <input
                id="alert-price-high"
                data-testid="alert-price-high-input"
                className={inputClass}
                inputMode="decimal"
                value={String(priceHigh)}
                readOnly
              />
            </div>
          ) : null}

          <div>
            <label className={labelClass} htmlFor="alert-recurrence">
              Options
            </label>
            <EdgeSelect
              testId="alert-recurrence-select"
              aria-label="Alert recurrence"
              value={recurrence}
              onChange={(value) => setRecurrence(value as AlertRecurrence)}
              options={recurrenceOptions}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="alert-message">
              Message
            </label>
            <input
              id="alert-message"
              data-testid="alert-message-input"
              className={inputClass}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Alert message"
            />
          </div>

          {alert ? (
            <p className="text-xs text-[var(--edge-text-muted)]">
              Status: {alert.status}
              {alert.lastFiredAt ? ` · Last fired ${new Date(alert.lastFiredAt).toLocaleString()}` : ""}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-xs text-[var(--edge-negative)]">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--edge-border-subtle)] px-4 py-3">
        {alert ? (
          <>
            <EdgeButton type="button" variant="secondary" onClick={() => void handlePauseToggle()}>
              {alert.status === "active" ? "Pause" : "Resume"}
            </EdgeButton>
            <EdgeButton type="button" variant="secondary" onClick={() => void handleDelete()}>
              Delete
            </EdgeButton>
          </>
        ) : null}
        <EdgeButton
          type="button"
          data-testid="alert-save-button"
          variant="primary"
          loading={saving}
          onClick={() => void handleSave()}
        >
          {alert ? "Save" : "Create alert"}
        </EdgeButton>
      </div>
    </div>
  );
}
