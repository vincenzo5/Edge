"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  EdgeButton,
  EdgeFlipChip,
  EdgeLabeledInput,
  EdgeSegmentedTabs,
  EdgeSelect,
  EdgeToggleSwitch,
} from "../design-system";
import { fieldClass } from "../design-system/styles";
import { useAccountOptional } from "../AccountProvider";
import { useAccountAliasesOptional } from "../AccountAliasesProvider";
import { useRiskSettingsOptional } from "../RiskSettingsProvider";
import { useRiskMarginContext } from "../risk/useRiskMarginContext";
import { isGatewayTradingAccount } from "@/lib/trading/accountPickerOptions";
import { computeEquityPositionSize } from "@/lib/risk/equityPositionSize";
import { computeOrderImpactEconomics } from "@/lib/trading/computeOrderImpact";
import { LIVE_CONFIRMATION_TOKEN, PREVIEW_INTENT_MAX_AGE_MS } from "@/lib/trading/validateOrder";
import {
  previewOrder,
  promotePlannedInstance,
  armPlannedSchedule,
  submitBracket,
  submitOrder,
  TradingApiError,
} from "@/lib/trading/tradingClient";
import { TradeOrderImpact } from "./TradeOrderImpact";
import {
  buildBracketPlanFromLevels,
  buildFixedStopLeg,
  buildTrailStopLeg,
  validateBracketGeometry,
} from "@/lib/trading/bracketPlan";
import type {
  BracketPlan,
  BracketPlacedResult,
  BracketStopLeg,
  OrderDraft,
  OrderIntent,
  OrderPreview,
  OrderSide,
  OrderType,
  PlacedOrderResult,
  StopLegMode,
  TimeInForce,
  TradingEnvironment,
} from "@/lib/trading/types";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import {
  atMarketRiskDollars,
  plannedRiskDollars,
} from "@/lib/trading/positionTradeSetup";
import { findTradeForOrderRef } from "@/lib/journal/correlateOrderRef";
import { fetchJournalFills, fetchJournalTrades } from "@/lib/persistence/client/journalClient";
import {
  ManagePlaybookPicker,
  type ManagePresetSelection,
} from "./ManagePlaybookPicker";
import { formatManageStepPreview } from "@/lib/trading/playbook/display";
import { getPlaybookPreset } from "@/lib/trading/playbook/presets";
import { planPlaybookSteps } from "@/lib/trading/playbook/planSteps";
import { lockPositionPlan } from "@/lib/trading/playbook/types";
import { summarizeSubmitRiskPlanFromBracket } from "@/lib/risk/summarizeSubmitRiskPlan";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import { useAccountRiskGateStatus } from "../risk/useAccountRiskGateStatus";
import { usePlaybookInstances } from "./usePlaybookInstances";
import { evaluateSubmitProtectGate } from "@/lib/risk/policy/submitProtectGate";
import { resolveEntryScheduleFireAt } from "@/lib/risk/policy/resolveEntrySchedule";
import type { EntrySchedule } from "@/lib/risk/policy/slotSchemas";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";
import { SubmitRiskPlanSummary } from "../risk/SubmitRiskPlanSummary";

export type { ManagePresetSelection };

export type TradeOrderFormProps = {
  symbol: string;
  theme?: "dark" | "light";
  planLevels?: PositionOrderLevels | null;
  lastPrice?: number | null;
  /** When false, show empty-state guidance instead of the form. */
  boundActive?: boolean;
  /** Applied once when plan levels arrive from a Risk / Trade setup handoff. */
  seedQuantity?: number | null;
  onSeedQuantityApplied?: () => void;
  /** Drawing-bound planned risk policy instance. */
  plannedInstance?: PlaybookInstance | null;
  onChangePolicy?: () => void;
  onPlannedRefresh?: () => void;
  testId?: string;
};

type Step = "form" | "confirm" | "success";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function resolveDisplayEntry(args: {
  orderType: OrderType;
  limitPrice: string;
  planEntry: number | null;
  lastPrice: number | null;
}): string {
  if (args.orderType === "LMT") {
    const parsed = Number.parseFloat(args.limitPrice);
    return Number.isFinite(parsed) ? formatPrice(parsed) : "—";
  }
  if (args.lastPrice != null && Number.isFinite(args.lastPrice)) {
    return `~${formatPrice(args.lastPrice)}`;
  }
  if (args.planEntry != null) {
    return `~${formatPrice(args.planEntry)}`;
  }
  return "—";
}

/** Format a price for the limit Entry input (max 2 decimal places). */
export function formatLimitPriceInput(price: number): string {
  return (Math.round(price * 100) / 100).toFixed(2);
}

/** Seed limit entry from plan entry, else last price. */
export function seedLimitPriceFromLast(args: {
  currentLimitPrice: string;
  planEntry: number | null;
  lastPrice: number | null;
}): string {
  if (args.currentLimitPrice.trim()) return args.currentLimitPrice;
  const seed = args.planEntry ?? args.lastPrice;
  return seed != null && Number.isFinite(seed) ? formatLimitPriceInput(seed) : args.currentLimitPrice;
}

export function buildOrderDraft(args: {
  accountId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  limitPrice: string;
  stopPrice: string;
  tif: TimeInForce;
  environment: TradingEnvironment;
  outsideRth?: boolean;
}): OrderDraft {
  const draft: OrderDraft = {
    accountId: args.accountId,
    symbol: args.symbol.trim().toUpperCase(),
    side: args.side,
    quantity: args.quantity,
    orderType: args.orderType,
    environment: args.environment,
    outsideRth: args.outsideRth ?? false,
    tif: args.tif,
  };
  if (args.orderType === "LMT" || args.orderType === "STP LMT") {
    draft.limitPrice = Number.parseFloat(args.limitPrice);
  }
  if (args.orderType === "STP" || args.orderType === "STP LMT") {
    draft.stopPrice = Number.parseFloat(args.stopPrice);
  }
  return draft;
}

function previewAgeMs(intent: OrderIntent | null): number {
  if (!intent) return Number.POSITIVE_INFINITY;
  return Date.now() - intent.updatedAt;
}

export function TradeOrderForm({
  symbol,
  theme = "dark",
  planLevels = null,
  lastPrice = null,
  boundActive = true,
  seedQuantity = null,
  onSeedQuantityApplied,
  plannedInstance = null,
  onChangePolicy,
  onPlannedRefresh,
  testId = "trade-order-form",
}: TradeOrderFormProps) {
  const account = useAccountOptional();
  const accountAliases = useAccountAliasesOptional();
  const riskSettings = useRiskSettingsOptional();
  const dollarRisk = riskSettings?.dollarRisk ?? null;
  const riskSettingsModel = riskSettings?.settings ?? null;
  const accountId = account?.activeTradingAccountId ?? "";
  const accountDisplayName = account?.activeTradingAccount
    ? (accountAliases?.displayNameFor(account.activeTradingAccount) ?? accountId)
    : accountId;
  const gatewayAccountSelected = isGatewayTradingAccount(account?.activeTradingAccount);
  const environment = account?.tradingEnvironment ?? "paper";
  const { instances: playbookInstances } = usePlaybookInstances(accountId);
  const openPositionCount =
    account?.positions?.filter((row) => (row.position ?? 0) !== 0).length ?? 0;

  const [step, setStep] = useState<Step>("form");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [quantity, setQuantity] = useState("1");
  const [orderType, setOrderType] = useState<OrderType>("MKT");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [tif, setTif] = useState<TimeInForce>("DAY");
  const [outsideRth, setOutsideRth] = useState(false);
  const [attachBracket, setAttachBracket] = useState(true);
  const [managePresetId, setManagePresetId] = useState<ManagePresetSelection>("off");
  const [manageNotifyAtManageLevels, setManageNotifyAtManageLevels] = useState(false);
  const [stopLegMode, setStopLegMode] = useState<StopLegMode>("fixed");
  const [trailAmount, setTrailAmount] = useState("");
  const [trailPercent, setTrailPercent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [previewIntent, setPreviewIntent] = useState<OrderIntent | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [placed, setPlaced] = useState<PlacedOrderResult | null>(null);
  const [placedBracket, setPlacedBracket] = useState<BracketPlacedResult | null>(null);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);
  const [liveConfirmText, setLiveConfirmText] = useState("");
  const [unprotectedConfirm, setUnprotectedConfirm] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [riskPlanOpen, setRiskPlanOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "session" | "clock">("now");
  const [sessionEvent, setSessionEvent] = useState<"nextRthOpen" | "nextRthClose">("nextRthOpen");
  const [clockAt, setClockAt] = useState("");
  const [clockTimeZone, setClockTimeZone] = useState("America/New_York");

  const policyBound = plannedInstance != null && plannedInstance.status === "planned";
  const policyTemplate = plannedInstance?.policySnapshot ?? null;
  const policyName =
    policyTemplate?.name ??
    (plannedInstance ? getPlaybookPreset(plannedInstance.templateId)?.name : null) ??
    plannedInstance?.templateId ??
    null;

  useEffect(() => {
    if (!planLevels) return;
    setSide(planLevels.side);
    setOrderType(policyBound ? "LMT" : "MKT");
    setLimitPrice(formatLimitPriceInput(planLevels.entry));
  }, [planLevels?.entry, planLevels?.side, planLevels?.stop, planLevels?.target, policyBound]);

  useEffect(() => {
    if (!plannedInstance?.entrySchedule) return;
    const schedule = plannedInstance.entrySchedule;
    if (schedule.kind === "immediate") {
      setScheduleMode("now");
      return;
    }
    if (schedule.kind === "sessionEvent") {
      setScheduleMode("session");
      setSessionEvent(schedule.event);
      return;
    }
    if (schedule.kind === "clock") {
      setScheduleMode("clock");
      setClockAt(schedule.at.slice(0, 16));
      setClockTimeZone(schedule.timeZone);
    }
  }, [plannedInstance?.entrySchedule, plannedInstance?.id]);

  useEffect(() => {
    if (!planLevels || seedQuantity == null) return;
    if (!Number.isFinite(seedQuantity) || seedQuantity <= 0) return;
    setQuantity(String(Math.round(seedQuantity)));
    onSeedQuantityApplied?.();
  }, [
    planLevels?.entry,
    planLevels?.stop,
    planLevels?.target,
    seedQuantity,
    onSeedQuantityApplied,
  ]);

  useEffect(() => {
    if (symbol) {
      setStep("form");
      setError(null);
      setPreview(null);
      setPreviewIntent(null);
      setPlaced(null);
      setPlacedBracket(null);
      setJournalTradeId(null);
    }
  }, [symbol, planLevels?.entry, planLevels?.stop, planLevels?.target]);

  const qtyNum = Number.parseFloat(quantity);
  const plannedRisk =
    planLevels && Number.isFinite(qtyNum) && qtyNum > 0
      ? plannedRiskDollars(planLevels.entry, planLevels.stop, qtyNum)
      : null;
  const marketRisk =
    planLevels &&
    lastPrice != null &&
    Number.isFinite(lastPrice) &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0
      ? atMarketRiskDollars(lastPrice, planLevels.stop, qtyNum, planLevels.direction)
      : null;

  const riskSizedQuantity = useMemo(() => {
    if (!planLevels || dollarRisk == null) return null;
    const result = computeEquityPositionSize({
      entry: planLevels.entry,
      stop: planLevels.stop,
      dollarRisk,
    });
    return result.ok ? result.shares : null;
  }, [planLevels, dollarRisk]);

  const draft = useMemo(() => {
    if (!gatewayAccountSelected || !accountId || !symbol.trim()) return null;
    const qty = Number.parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    try {
      return buildOrderDraft({
        accountId,
        symbol,
        side,
        quantity: qty,
        orderType,
        limitPrice,
        stopPrice,
        tif,
        environment,
        outsideRth,
      });
    } catch {
      return null;
    }
  }, [
    gatewayAccountSelected,
    accountId,
    symbol,
    side,
    quantity,
    orderType,
    limitPrice,
    stopPrice,
    tif,
    environment,
    outsideRth,
  ]);

  const stopLeg = useMemo((): BracketStopLeg | null => {
    if (!planLevels) return null;
    if (stopLegMode === "trail") {
      const amount = Number.parseFloat(trailAmount);
      const percent = Number.parseFloat(trailPercent);
      if (Number.isFinite(amount) && amount > 0) {
        return buildTrailStopLeg({ trailAmount: amount });
      }
      if (Number.isFinite(percent) && percent > 0) {
        return buildTrailStopLeg({ trailPercent: percent });
      }
      return null;
    }
    return buildFixedStopLeg(planLevels.stop);
  }, [planLevels, stopLegMode, trailAmount, trailPercent]);

  const bracketPlan = useMemo((): BracketPlan | null => {
    if (!draft || !planLevels || !attachBracket || !stopLeg) return null;
    const plan = buildBracketPlanFromLevels({
      entry: draft,
      planLevels,
      stopLeg,
    });
    return validateBracketGeometry(plan) ? null : plan;
  }, [attachBracket, draft, planLevels, stopLeg]);

  const manageEnabled = attachBracket && managePresetId !== "off";

  const managePreviewPlan = useMemo(() => {
    if (!planLevels || !draft || !manageEnabled) return null;
    const entryPrice =
      draft.orderType === "LMT" && draft.limitPrice != null
        ? draft.limitPrice
        : planLevels.entry;
    return lockPositionPlan({
      symbol: draft.symbol,
      accountId: draft.accountId,
      side: draft.side,
      entry: entryPrice,
      initialStop: planLevels.stop,
      qty: draft.quantity,
      environment: draft.environment,
    });
  }, [draft, manageEnabled, planLevels]);

  const managePreviewSteps = useMemo(() => {
    if (!managePreviewPlan || managePresetId === "off") return [];
    const template = getPlaybookPreset(managePresetId);
    if (!template) return [];
    return planPlaybookSteps(template, managePreviewPlan);
  }, [managePreviewPlan, managePresetId]);

  const bracketGeometryError = useMemo(() => {
    if (!draft || !planLevels || !attachBracket || !stopLeg) return null;
    return validateBracketGeometry(
      buildBracketPlanFromLevels({ entry: draft, planLevels, stopLeg }),
    );
  }, [attachBracket, draft, planLevels, stopLeg]);

  const accountGates = useAccountRiskGateStatus({
    settings: riskSettingsModel ?? DEFAULT_RISK_SETTINGS,
    accountSummary: account?.summary ?? null,
    pnl: account?.pnl ?? null,
    playbookInstances,
    openPositionCount,
    proposedRiskDollars: plannedRisk ?? dollarRisk,
  });

  const submitRiskSummary = useMemo(() => {
    const qty = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null;
    return summarizeSubmitRiskPlanFromBracket({
      environment,
      quantity: qty,
      dollarRisk,
      plannedRiskDollars: plannedRisk,
      attachProtect: policyBound ? true : attachBracket,
      bracketPlan: policyBound && planLevels && draft
        ? buildBracketPlanFromLevels({
            entry: draft,
            planLevels,
            stopLeg: buildFixedStopLeg(planLevels.stop),
          })
        : bracketPlan,
      managePresetId: policyBound ? plannedInstance?.templateId ?? "off" : managePresetId,
      accountGates: riskSettingsModel != null ? accountGates : null,
      side,
    });
  }, [
    attachBracket,
    bracketPlan,
    dollarRisk,
    draft,
    environment,
    managePresetId,
    planLevels,
    plannedInstance?.templateId,
    plannedRisk,
    policyBound,
    qtyNum,
    accountGates,
    riskSettingsModel,
    side,
  ]);

  const protectGate = useMemo(
    () =>
      evaluateSubmitProtectGate({
        environment,
        template: policyTemplate,
        unprotectedConfirm,
      }),
    [environment, policyTemplate, unprotectedConfirm],
  );

  const entryScheduleSelection = useMemo((): EntrySchedule => {
    if (scheduleMode === "now") return { kind: "immediate" };
    if (scheduleMode === "session") return { kind: "sessionEvent", event: sessionEvent };
    const parsed = Date.parse(clockAt);
    return {
      kind: "clock",
      at: Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString(),
      timeZone: clockTimeZone,
    };
  }, [clockAt, clockTimeZone, scheduleMode, sessionEvent]);

  const manageStepLabels = useMemo(
    () => managePreviewSteps.map((step) => formatManageStepPreview(step)),
    [managePreviewSteps],
  );

  const displayEntry = useMemo(
    () =>
      resolveDisplayEntry({
        orderType,
        limitPrice,
        planEntry: planLevels?.entry ?? null,
        lastPrice,
      }),
    [lastPrice, limitPrice, orderType, planLevels?.entry],
  );

  const executableEntry = useMemo(() => {
    if (orderType === "LMT") {
      const parsed = Number.parseFloat(limitPrice);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return planLevels?.entry ?? null;
    }
    if (lastPrice != null && Number.isFinite(lastPrice) && lastPrice > 0) return lastPrice;
    return planLevels?.entry ?? null;
  }, [lastPrice, limitPrice, orderType, planLevels?.entry]);

  const protectionEnabled = Boolean(planLevels && attachBracket);

  const orderImpact = useMemo(
    () =>
      computeOrderImpactEconomics({
        quantity: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null,
        executableEntry,
        stop: protectionEnabled && planLevels ? planLevels.stop : null,
        target: protectionEnabled && planLevels ? planLevels.target : null,
        protectionEnabled,
      }),
    [executableEntry, planLevels, protectionEnabled, qtyNum],
  );

  const marginCtx = useRiskMarginContext({
    symbol: symbol.trim() || null,
    shares: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null,
    direction: side === "BUY" ? "long" : "short",
    notional: orderImpact.notional,
    entryPrice: executableEntry,
    enabled: draft != null && step === "form",
  });

  const activeRiskDollars = useMemo(() => {
    if (!attachBracket || !planLevels) return null;
    if (orderType === "MKT" && marketRisk != null) return marketRisk;
    return plannedRisk;
  }, [attachBracket, marketRisk, orderType, planLevels, plannedRisk]);

  const primaryCtaLabel = useMemo(() => {
    if (loading) return "Previewing…";
    if (policyBound && scheduleMode !== "now") return "Preview schedule";
    return side === "BUY" ? "Buy" : "Sell";
  }, [loading, policyBound, scheduleMode, side]);

  const showRiskPlan =
    policyBound || Boolean(planLevels && attachBracket) || manageEnabled;

  const confirmSubmitLabel = useMemo(() => {
    if (loading) return "Submitting…";
    if (policyBound && scheduleMode !== "now") {
      return environment === "live" ? "Confirm arm schedule" : "Arm schedule";
    }
    if (environment === "live") {
      return side === "BUY" ? "Confirm buy" : "Confirm sell";
    }
    return side === "BUY" ? "Confirm buy" : "Confirm sell";
  }, [environment, loading, policyBound, scheduleMode, side]);

  const confirmHeadline = useMemo(() => {
    if (!draft) return "";
    const entryToken =
      draft.orderType === "LMT" && draft.limitPrice != null
        ? formatPrice(draft.limitPrice)
        : "MKT";
    return `${draft.side} ${draft.quantity} ${draft.symbol} @ ${entryToken} · ${draft.orderType} · ${draft.tif}`;
  }, [draft]);

  const confirmBracketLine = useMemo(() => {
    if (!planLevels || !attachBracket) return null;
    const parts = [
      `Stop ${formatPrice(planLevels.stop)}`,
      `Target ${formatPrice(planLevels.target)}`,
    ];
    if (activeRiskDollars != null) {
      parts.push(`Risk ${formatMoney(activeRiskDollars)}`);
    }
    if (planLevels.riskRewardRatio != null) {
      parts.push(`R:R ${planLevels.riskRewardRatio.toFixed(1)}`);
    }
    return parts.join(" · ");
  }, [activeRiskDollars, attachBracket, planLevels]);

  const handleSizeForRisk = useCallback(() => {
    if (riskSizedQuantity == null) return;
    setQuantity(String(riskSizedQuantity));
  }, [riskSizedQuantity]);

  const handlePreview = async () => {
    if (!draft) {
      setError(
        !gatewayAccountSelected
          ? "Select a connected Gateway account in the header before trading."
          : accountId
            ? "Complete all required fields."
            : "Select an account in the header before trading.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await previewOrder(draft);
      setPreview(result.preview);
      setPreviewIntent(result.intent);
      setIdempotencyKey(crypto.randomUUID());
      setStep("confirm");
    } catch (err) {
      if (err instanceof TradingApiError) {
        const reasonText = err.reasons?.length ? ` (${err.reasons.join("; ")})` : "";
        setError(`${err.message}${reasonText}`);
      } else {
        setError("Preview failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveJournalTrade = async (orderRef: string) => {
    try {
      const [fills, trades] = await Promise.all([
        fetchJournalFills(),
        fetchJournalTrades(),
      ]);
      const trade = findTradeForOrderRef(fills, trades, orderRef);
      setJournalTradeId(trade?.id ?? null);
    } catch {
      setJournalTradeId(null);
    }
  };

  const handleSubmit = async () => {
    if (!draft || !previewIntent) return;
    if (previewAgeMs(previewIntent) > PREVIEW_INTENT_MAX_AGE_MS - 5_000) {
      await handlePreview();
      setError("Preview refreshed — review and confirm again.");
      return;
    }

    if (policyBound && plannedInstance) {
      if (protectGate.kind === "hard_block_live") {
        setError("Live submit blocked — add Bracket or confirm entry-only submit.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (scheduleMode !== "now") {
          const scheduledFor =
            resolveEntryScheduleFireAt(entryScheduleSelection, new Date()) ?? undefined;
          await armPlannedSchedule(plannedInstance.id, {
            entrySchedule: entryScheduleSelection,
            scheduledFor,
          });
          onPlannedRefresh?.();
          setStep("success");
          setPlaced(null);
          setPlacedBracket(null);
          setError(null);
          return;
        }

        await promotePlannedInstance(plannedInstance.id, {
          idempotencyKey: idempotencyKey || crypto.randomUUID(),
          previewIntentId: previewIntent.intentId,
          liveConfirmation:
            environment === "live" ? LIVE_CONFIRMATION_TOKEN : undefined,
          unprotectedConfirm,
          takeProfitPrice: planLevels?.target,
        });
        onPlannedRefresh?.();
        setStep("success");
        void account?.refresh();
        if (plannedInstance.orderRef) {
          void resolveJournalTrade(plannedInstance.orderRef);
        }
        return;
      } catch (err) {
        if (err instanceof TradingApiError) {
          const reasonText = err.reasons?.length ? ` (${err.reasons.join("; ")})` : "";
          setError(`${err.message}${reasonText}`);
        } else {
          setError("Submit failed. Try again.");
        }
        return;
      } finally {
        setLoading(false);
      }
    }

    if (attachBracket && planLevels && !bracketPlan) {
      setError(bracketGeometryError ?? "Complete bracket stop/TP before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (attachBracket && bracketPlan) {
        const result = await submitBracket({
          plan: bracketPlan,
          idempotencyKey: idempotencyKey || crypto.randomUUID(),
          previewIntentId: previewIntent.intentId,
          liveConfirmation:
            environment === "live" ? LIVE_CONFIRMATION_TOKEN : undefined,
          ...(manageEnabled && managePreviewPlan
            ? {
                playbookTemplateId: managePresetId,
                playbookEntryPrice: managePreviewPlan.entry,
                playbookInitialStop: managePreviewPlan.initialStop,
                playbookNotifyAtManageLevels: manageNotifyAtManageLevels,
              }
            : {}),
        });
        setPlacedBracket(result);
        setPlaced(null);
        setStep("success");
        void account?.refresh();
        void resolveJournalTrade(result.orderRef);
        return;
      }

      const result = await submitOrder({
        draft,
        idempotencyKey: idempotencyKey || crypto.randomUUID(),
        previewIntentId: previewIntent.intentId,
        liveConfirmation:
          environment === "live" ? LIVE_CONFIRMATION_TOKEN : undefined,
      });
      setPlaced(result);
      setPlacedBracket(null);
      setStep("success");
      void account?.refresh();
      void resolveJournalTrade(result.orderRef);
    } catch (err) {
      if (err instanceof TradingApiError) {
        if (err.message.toLowerCase().includes("preview expired")) {
          await handlePreview();
          setError("Preview expired — refreshed. Review and confirm again.");
          return;
        }
        const reasonText = err.reasons?.length ? ` (${err.reasons.join("; ")})` : "";
        setError(`${err.message}${reasonText}`);
      } else {
        setError("Submit failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = useCallback(() => {
    setStep("form");
    setError(null);
  }, []);

  if (!boundActive) {
    return (
      <div className="px-3 py-6 text-xs text-[var(--edge-text-secondary)]" data-testid={testId}>
        <p className="text-[var(--edge-text-strong)]">No trade setup linked</p>
        <p className="mt-2">
          Right-click a long or short position drawing on the chart and choose{" "}
          <span className="text-[var(--edge-text-strong)]">Trade setup…</span> to
          link entry, stop, and take profit levels here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid={testId}>
      {error ? (
        <p className="mx-3 mt-3 text-xs text-[var(--edge-negative)]" role="alert">
          {error}
        </p>
      ) : null}

      {step === "form" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 text-xs">
          <div className="mb-3">
            <div className="text-sm font-medium text-[var(--edge-text-strong)]">{symbol}</div>
            <div
              className="mt-0.5 text-[10px] text-[var(--edge-text-secondary)]"
              data-testid="trade-account-chip"
            >
              {environment === "live" ? "Live" : "Paper"}
              {" · "}
              {gatewayAccountSelected
                ? accountDisplayName || "No account"
                : accountDisplayName
                  ? account?.activeTradingAccount?.availability === "offline"
                    ? `${accountDisplayName} (offline)`
                    : "Select Gateway account in header"
                  : "No account"}
            </div>
          </div>

          {planLevels ? (
            <div className="mb-3 space-y-1 rounded border border-[var(--edge-border)] px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                Plan (from drawing)
              </div>
              <PlanRow label="Entry" value={formatPrice(planLevels.entry)} />
              <PlanRow label="Stop" value={formatPrice(planLevels.stop)} />
              <PlanRow label="Take profit" value={formatPrice(planLevels.target)} />
              {planLevels.riskRewardRatio != null ? (
                <PlanRow
                  label="R:R"
                  value={`${planLevels.riskRewardRatio.toFixed(1)}R`}
                />
              ) : null}
              {plannedRisk != null ? (
                <PlanRow label="Plan risk" value={formatMoney(plannedRisk)} />
              ) : null}
              {marketRisk != null && orderType === "MKT" ? (
                <PlanRow label="At market risk" value={formatMoney(marketRisk)} />
              ) : null}
            </div>
          ) : null}

          {policyBound && policyName ? (
            <div
              className="mb-3 space-y-1 rounded border border-[var(--edge-border)] px-2 py-2"
              data-testid="trade-policy-summary"
            >
              <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                Risk policy
              </div>
              <div className="text-[var(--edge-text-strong)]">{policyName}</div>
              <p className="text-[10px] text-[var(--edge-text-secondary)]">
                Bracket + Manage seeded from drawing policy snapshot.
              </p>
              {onChangePolicy ? (
                <EdgeButton
                  type="button"
                  variant="secondary"
                  className="h-7 w-full text-[10px]"
                  onClick={onChangePolicy}
                  data-testid="trade-change-policy"
                >
                  Change…
                </EdgeButton>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-[auto_1fr_auto] items-end gap-1.5">
            <EdgeFlipChip
              value={side}
              options={[
                { value: "BUY", label: "Buy" },
                { value: "SELL", label: "Sell" },
              ]}
              onChange={(value) => setSide(value)}
              ariaLabel="Side"
              tone={(value) => (value === "BUY" ? "positive" : "negative")}
              density="compact"
              testId="trade-side"
              className="min-w-[4rem]"
            />
            <EdgeLabeledInput
              label="Quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              density="compact"
              testId="trade-quantity"
            />
            <EdgeFlipChip
              value={orderType === "LMT" ? "LMT" : "MKT"}
              options={[
                { value: "MKT", label: "Market" },
                { value: "LMT", label: "Limit" },
              ]}
              onChange={(value) => {
                const next = value as OrderType;
                setOrderType(next);
                if (next === "LMT") {
                  setLimitPrice((current) =>
                    seedLimitPriceFromLast({
                      currentLimitPrice: current,
                      planEntry: planLevels?.entry ?? null,
                      lastPrice,
                    }),
                  );
                }
              }}
              ariaLabel="Order type"
              density="compact"
              testId="trade-order-type"
              className="min-w-[5.5rem]"
            />
          </div>

          <div
            className="mt-2 flex items-center justify-between gap-3"
            data-testid="trade-session-row"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-[10px] text-[var(--edge-text-secondary)]">
                Duration
              </span>
              <EdgeSelect
                value={tif}
                onChange={(value) => setTif(value as TimeInForce)}
                options={[
                  { value: "DAY", label: "Day" },
                  { value: "GTC", label: "GTC" },
                ]}
                density="compact"
                variant="chip"
                aria-label="Duration"
                testId="trade-tif"
                className="min-w-[4.5rem]"
                minWidth={120}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className="text-[10px] text-[var(--edge-text-secondary)]"
                title="Allow fills in pre-market and after-hours. Liquidity may be thin."
              >
                Extended hours
              </span>
              <EdgeToggleSwitch
                checked={outsideRth}
                onChange={setOutsideRth}
                size="compact"
                ariaLabel="Allow extended hours"
                testId="trade-outside-rth"
              />
            </div>
          </div>

          {orderType === "LMT" ? (
            <div className="mt-2">
              <EdgeLabeledInput
                label="Entry"
                type="number"
                min={0}
                step="0.01"
                value={limitPrice}
                onChange={(event) => setLimitPrice(event.target.value)}
                density="compact"
                testId="trade-limit-price"
              />
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-[10px] text-[var(--edge-text-secondary)]">Entry</div>
              <div
                className="mt-1 font-mono text-[var(--edge-text-strong)]"
                data-testid="trade-entry-display"
              >
                {displayEntry}
              </div>
            </div>
          )}

          {planLevels && !policyBound ? (
            <div className="mt-3 space-y-2" data-testid="trade-bracket-surface">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={attachBracket}
                  onChange={(event) => {
                    setAttachBracket(event.target.checked);
                    if (!event.target.checked) {
                      setManagePresetId("off");
                    }
                  }}
                  data-testid="trade-attach-bracket"
                />
                <span className="text-[var(--edge-text-secondary)]">Bracket</span>
              </label>
              {attachBracket ? (
                <p
                  className="text-[10px] text-[var(--edge-text-secondary)]"
                  data-testid="trade-bracket-risk-line"
                >
                  Stop {formatPrice(planLevels.stop)} · Target {formatPrice(planLevels.target)}
                  {activeRiskDollars != null ? ` · risk ${formatMoney(activeRiskDollars)}` : ""}
                  {planLevels.riskRewardRatio != null
                    ? ` · R:R ${planLevels.riskRewardRatio.toFixed(1)}`
                    : ""}
                </p>
              ) : (
                <p className="text-[10px] text-[var(--edge-text-secondary)]">Bracket off</p>
              )}
            </div>
          ) : null}

          {planLevels ? (
            <EdgeButton
              type="button"
              variant="secondary"
              className="mt-2 w-full"
              disabled={riskSizedQuantity == null}
              title={
                riskSizedQuantity == null
                  ? dollarRisk == null
                    ? "Set a risk budget in Risk calculator"
                    : "Stop is too wide for the current risk budget"
                  : undefined
              }
              onClick={handleSizeForRisk}
              data-testid="trade-size-for-risk"
            >
              Size for risk
            </EdgeButton>
          ) : null}

          {policyBound ? (
            <EdgeButton
              type="button"
              variant="secondary"
              className="mt-2 w-full text-[10px]"
              onClick={() => setOrderType("MKT")}
              data-testid="trade-market-one-click"
            >
              Market (one-click)
            </EdgeButton>
          ) : null}

          {policyBound ? (
            <div className="mt-3 space-y-2" data-testid="trade-entry-schedule">
              <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                When
              </div>
              <EdgeSegmentedTabs
                segments={[
                  { id: "now", label: "Now" },
                  { id: "session", label: "Session" },
                  { id: "clock", label: "Clock" },
                ]}
                value={scheduleMode}
                onChange={(value) =>
                  setScheduleMode(value as "now" | "session" | "clock")
                }
              />
              {scheduleMode === "session" ? (
                <select
                  className={`${fieldClass({ density: "standard" })} w-full`}
                  value={sessionEvent}
                  onChange={(event) =>
                    setSessionEvent(event.target.value as "nextRthOpen" | "nextRthClose")
                  }
                >
                  <option value="nextRthOpen">Next RTH open</option>
                  <option value="nextRthClose">Next RTH close</option>
                </select>
              ) : null}
              {scheduleMode === "clock" ? (
                <div className="space-y-2">
                  <input
                    type="datetime-local"
                    className={`${fieldClass({ density: "standard" })} w-full`}
                    value={clockAt}
                    onChange={(event) => setClockAt(event.target.value)}
                  />
                  <input
                    type="text"
                    className={`${fieldClass({ density: "standard" })} w-full`}
                    value={clockTimeZone}
                    onChange={(event) => setClockTimeZone(event.target.value)}
                    placeholder="Time zone (IANA)"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {planLevels && !policyBound && attachBracket ? (
            <>
              <div className="mt-3">
                <EdgeButton
                  type="button"
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => setAdvancedOpen((open) => !open)}
                  data-testid="trade-advanced-toggle"
                  aria-expanded={advancedOpen}
                >
                  <span>Advanced</span>
                  <span aria-hidden>{advancedOpen ? "▾" : "▸"}</span>
                </EdgeButton>
              </div>

              {advancedOpen ? (
                <div
                  className="mt-2 space-y-3 rounded border border-[var(--edge-border)] px-2 py-2"
                  data-testid="trade-advanced-panel"
                >
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                      Stop leg
                    </div>
                    <EdgeSegmentedTabs
                      segments={[
                        { id: "fixed", label: "Fixed" },
                        { id: "trail", label: "Trail" },
                      ]}
                      value={stopLegMode}
                      onChange={(value) => setStopLegMode(value as StopLegMode)}
                    />
                    {stopLegMode === "trail" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[var(--edge-text-secondary)]">Trail $</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`mt-1 ${fieldClass({ density: "standard" })}`}
                            value={trailAmount}
                            onChange={(event) => setTrailAmount(event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[var(--edge-text-secondary)]">Trail %</span>
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            className={`mt-1 ${fieldClass({ density: "standard" })}`}
                            value={trailPercent}
                            onChange={(event) => setTrailPercent(event.target.value)}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <ManagePlaybookPicker
                    value={managePresetId}
                    onChange={setManagePresetId}
                    positionPlan={managePreviewPlan}
                    notifyAtManageLevels={manageNotifyAtManageLevels}
                    onNotifyChange={setManageNotifyAtManageLevels}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {policyBound && protectGate.kind === "soft_warn_paper" ? (
            <p className="mt-2 text-[10px] text-[var(--edge-warning)]" role="status">
              Paper warn: policy has no resting Bracket exit.
            </p>
          ) : null}

          {policyBound && protectGate.kind === "hard_block_live" ? (
            <label className="mt-2 flex items-center gap-2 text-[10px] text-[var(--edge-negative)]">
              <input
                type="checkbox"
                checked={unprotectedConfirm}
                onChange={(event) => setUnprotectedConfirm(event.target.checked)}
                data-testid="trade-unprotected-confirm"
              />
              Submit entry only (live escape)
            </label>
          ) : null}

          {draft ? (
            <div className="mt-3">
              <TradeOrderImpact
                economics={orderImpact}
                initMarginChange={marginCtx.impact?.initMarginChange ?? null}
                availableAfter={marginCtx.impact?.headroomAfter ?? null}
                impactStatus={marginCtx.impactStatus}
                marginEstimated={marginCtx.impact?.estimated ?? true}
                marginLoading={marginCtx.loading}
                marginError={marginCtx.error}
                accountConnected={marginCtx.accountConnected}
                onAddStop={
                  planLevels && !policyBound && !attachBracket
                    ? () => setAttachBracket(true)
                    : undefined
                }
                riskPlan={
                  showRiskPlan
                    ? {
                        teaser: `${submitRiskSummary.budget.label} · ${submitRiskSummary.size.label}`,
                        open: riskPlanOpen,
                        onToggle: () => setRiskPlanOpen((open) => !open),
                        detail: (
                          <SubmitRiskPlanSummary
                            summary={submitRiskSummary}
                            manageSteps={manageEnabled ? manageStepLabels : undefined}
                            compact
                          />
                        ),
                      }
                    : null
                }
              />
            </div>
          ) : null}

          <p className="mt-3 text-[10px] text-[var(--edge-text-secondary)]">
            {environment === "live"
              ? "Live stock orders — real money"
              : policyBound
                ? scheduleMode === "now"
                  ? "Paper policy submit — entry + Bracket from planned instance"
                  : "Paper schedule arm — entry fires when due"
                : planLevels && attachBracket
                  ? "Paper bracket — entry + live stop/TP"
                  : "Paper stock orders — entry only"}
          </p>

          <div className="mt-4 flex gap-2">
            <EdgeButton
              theme={theme}
              variant="primary"
              className={
                policyBound && scheduleMode !== "now"
                  ? "flex-1"
                  : side === "BUY"
                    ? "flex-1 !bg-[var(--edge-positive)] hover:!bg-[color-mix(in_srgb,var(--edge-positive)_82%,black)]"
                    : "flex-1 !bg-[var(--edge-negative)] hover:!bg-[color-mix(in_srgb,var(--edge-negative)_82%,black)]"
              }
              disabled={loading || !draft}
              onClick={() => void handlePreview()}
              data-testid="trade-primary-cta"
            >
              {primaryCtaLabel}
            </EdgeButton>
          </div>
        </div>
      ) : null}

      {step === "confirm" && preview && draft ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 text-xs">
          <div
            className="rounded border border-[var(--edge-border)] px-3 py-2"
            data-testid="trade-confirm-headline"
          >
            <div className="font-medium text-[var(--edge-text-strong)]">{confirmHeadline}</div>
            {confirmBracketLine ? (
              <div className="mt-1 text-[var(--edge-text-secondary)]">{confirmBracketLine}</div>
            ) : null}
            <div className="mt-1 text-[var(--edge-text-secondary)]">
              Account {draft.accountId} · {draft.environment}
              {draft.outsideRth ? " · Extended hours" : ""}
            </div>
          </div>
          <div className="mt-2">
            <SubmitRiskPlanSummary
              summary={submitRiskSummary}
              manageSteps={manageEnabled ? manageStepLabels : undefined}
            />
          </div>
          {outsideRth ? (
            <p className="mt-2 text-[var(--edge-warning)]">
              Extended hours — liquidity may be thin; fills are not guaranteed.
            </p>
          ) : null}
          {environment === "live" ? (
            <p className="mt-2 text-[var(--edge-negative)]">
              Live order — real money. Type {LIVE_CONFIRMATION_TOKEN} below to submit.
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Metric label="Commission" value={formatMoney(preview.commission)} />
            <Metric label="Init margin Δ" value={formatMoney(preview.initMarginChange)} />
            <Metric label="Maint margin Δ" value={formatMoney(preview.maintMarginChange)} />
            <Metric label="Equity Δ" value={formatMoney(preview.equityWithLoanChange)} />
          </div>
          {preview.warnings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[var(--edge-warning)]">
              {preview.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          ) : null}
          {environment === "live" ? (
            <label className="mt-3 block">
              <span className="text-[var(--edge-text-secondary)]">
                Type {LIVE_CONFIRMATION_TOKEN} to confirm
              </span>
              <input
                type="text"
                className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 font-mono uppercase"
                value={liveConfirmText}
                onChange={(event) => setLiveConfirmText(event.target.value)}
                autoComplete="off"
              />
            </label>
          ) : null}
          <div className="mt-4 flex gap-2">
            <EdgeButton
              theme={theme}
              onClick={handleBackToForm}
              disabled={loading}
              data-testid="trade-confirm-cancel"
            >
              Cancel
            </EdgeButton>
            <EdgeButton
              theme={theme}
              variant="primary"
              className="flex-1"
              disabled={
                loading ||
                !previewIntent ||
                (environment === "live" && liveConfirmText.trim() !== LIVE_CONFIRMATION_TOKEN) ||
                (policyBound &&
                  protectGate.kind === "hard_block_live" &&
                  !unprotectedConfirm)
              }
              onClick={() => void handleSubmit()}
              data-testid="trade-confirm-submit"
            >
              {confirmSubmitLabel}
            </EdgeButton>
          </div>
        </div>
      ) : null}

      {step === "success" && (placed || placedBracket || policyBound) ? (
        <div className="space-y-2 px-3 py-3 text-xs">
          {policyBound && !placed && !placedBracket ? (
            <p className="text-[var(--edge-text-strong)]">
              {scheduleMode !== "now"
                ? `Schedule armed for ${policyName ?? "policy"} — entry will submit when due.`
                : `Policy promoted to pending fill for ${policyName ?? "policy"}.`}
            </p>
          ) : null}
          {placedBracket ? (
            <>
              <p className="text-[var(--edge-text-strong)]">
                Bracket submitted on {draft?.environment ?? "paper"} account.
              </p>
              <div className="rounded border border-[var(--edge-border)] px-3 py-2 space-y-1">
                <div>
                  Entry order {placedBracket.entryOrder.orderId ?? "—"}
                </div>
                <div>Stop order {placedBracket.stopOrder.orderId ?? "—"}</div>
                <div>
                  Take profit order {placedBracket.takeProfitOrder.orderId ?? "—"}
                </div>
                <div className="text-[var(--edge-text-secondary)]">Order ref</div>
                <div className="font-mono text-[11px] break-all">{placedBracket.orderRef}</div>
              </div>
            </>
          ) : placed ? (
            <>
              <p className="text-[var(--edge-text-strong)]">
                Order {placed.order.orderId ?? "—"} submitted on {draft?.environment ?? "paper"}{" "}
                account.
              </p>
              <div className="rounded border border-[var(--edge-border)] px-3 py-2">
                <div className="text-[var(--edge-text-secondary)]">Order ref</div>
                <div className="font-mono text-[11px] break-all">{placed.orderRef}</div>
              </div>
            </>
          ) : null}
          {journalTradeId ? (
            <Link
              href={`/journal/trades?trade=${journalTradeId}`}
              className="inline-block text-[var(--edge-accent-blue)] hover:underline"
            >
              View in journal
            </Link>
          ) : (
            <p className="text-[var(--edge-text-secondary)]">
              Fills sync to journal automatically when executions arrive.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[var(--edge-text-secondary)]">{label}</span>
      <span className="font-mono text-[var(--edge-text-strong)]">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--edge-border-subtle)] px-2 py-1.5">
      <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
