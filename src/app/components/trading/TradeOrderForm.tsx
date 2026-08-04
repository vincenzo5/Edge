"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  EdgeButton,
  EdgeHelpIcon,
  EdgeLabeledInput,
  EdgeSegmentedTabs,
  EdgeSelect,
  EdgeToggleSwitch,
  EdgeUnderlineTabs,
} from "../design-system";
import { BuySellToggle } from "./BuySellToggle";
import { LinkedProtectLevelsEditor } from "./LinkedProtectLevelsEditor";
import { TradePolicyPicker } from "./TradePolicyPicker";
import { fieldClass } from "../design-system/styles";
import { useAccountOptional } from "../AccountProvider";
import { useAccountAliasesOptional } from "../AccountAliasesProvider";
import { useRiskSettingsOptional } from "../RiskSettingsProvider";
import { useRiskMarginContext } from "../risk/useRiskMarginContext";
import { isGatewayTradingAccount } from "@/lib/trading/accountPickerOptions";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import { resolvePolicyTicketBudget } from "@/lib/risk/policy/resolvePolicyTicketBudget";
import type { TicketBudgetUnit } from "@/lib/risk/policy/resolvePolicyTicketBudget";
import { dollarRiskFromTicketRiskInput } from "@/lib/risk/ticketSizeBudget";
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
  buildBracketPlanWithPrices,
  buildFixedStopLeg,
  buildTrailStopLeg,
  validateBracketGeometry,
} from "@/lib/trading/bracketPlan";
import { directionFromSide, defaultProtectPrices } from "@/lib/trading/linkedProtectLevels";
import { summarizeOrderCtaLabel } from "@/lib/trading/summarizeOrderCta";
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
import { riskPolicyTemplateToPlaybookTemplate } from "@/lib/risk/policy/templatePersistence";
import { useAccountRiskGateStatus } from "../risk/useAccountRiskGateStatus";
import { usePlaybookInstances } from "./usePlaybookInstances";
import { evaluateSubmitProtectGate } from "@/lib/risk/policy/submitProtectGate";
import { deriveProtectExitQuantities } from "@/lib/risk/policy/deriveProtectExitQuantities";
import type { PolicyTradeDraftPatch } from "@/lib/risk/policy/applyPolicyToTradeDraft";
import { resolveEntryScheduleFireAt } from "@/lib/risk/policy/resolveEntrySchedule";
import type { EntrySchedule } from "@/lib/risk/policy/slotSchemas";
import type { PlaybookInstance, PlaybookInstanceWithPolicy } from "@/lib/trading/playbook/types";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import { SubmitRiskPlanSummary } from "../risk/SubmitRiskPlanSummary";
import type { TradePolicyFormContext } from "./useTradePolicyApply";
import { TradeSizeBudgetField } from "./TradeSizeBudgetField";
import {
  isTifValidForOrderType,
  supportsBracketAttach,
  supportsPriceMgmtAlgo,
  tifLabel,
  tifOptionsForOrderType,
} from "@/lib/trading/orderTicketOptions";

export type { ManagePresetSelection };

export type TradeOrderFormProps = {
  symbol: string;
  theme?: "dark" | "light";
  planLevels?: PositionOrderLevels | null;
  lastPrice?: number | null;
  /** Applied once when plan levels arrive from a Risk / Trade setup handoff. */
  seedQuantity?: number | null;
  onSeedQuantityApplied?: () => void;
  /** Drawing-bound planned risk policy instance. */
  plannedInstance?: PlaybookInstanceWithPolicy | null;
  onChangePolicy?: () => void;
  onPlannedRefresh?: () => void;
  policyTemplates?: PlaybookTemplate[];
  selectedPolicyId?: string | null;
  onPolicyChange?: (templateId: string | null) => void;
  policyLoading?: boolean;
  policyApplyError?: string | null;
  policyPickerEnabled?: boolean;
  policyDraftPatch?: PolicyTradeDraftPatch | null;
  onPolicyDraftConsumed?: () => void;
  onPolicyFormContextChange?: (context: TradePolicyFormContext) => void;
  testId?: string;
};

type Step = "form" | "confirm" | "success";

const ORDER_TYPE_TABS = [
  { id: "MKT", label: "Market" },
  { id: "LMT", label: "Limit" },
  { id: "STP", label: "Stop" },
  { id: "STP LMT", label: "Stop Limit" },
  { id: "TRAIL", label: "Trail" },
  { id: "TRAIL LIMIT", label: "Trail Lmt" },
  { id: "MOC", label: "MOC" },
  { id: "LOC", label: "LOC" },
] as const;

const SESSION_FIELD_HELP = {
  tif: "How long the order stays active. Day expires at the close. GTC stays until filled or canceled. IOC fills immediately or cancels the rest. At the Opening applies at the market open.",
  allOrNone:
    "Fill the entire quantity in one execution, or do not fill at all. Partial fills are not allowed.",
  extendedHours:
    "Allow fills in pre-market and after-hours, not only regular session hours. Liquidity may be thinner.",
} as const;

export function handleOrderTypeTabChange(args: {
  nextType: OrderType;
  planEntry: number | null;
  planStop: number | null;
  lastPrice: number | null;
  currentLimitPrice: string;
  currentStopPrice: string;
}): { limitPrice: string; stopPrice: string } {
  let limitPrice = args.currentLimitPrice;
  let stopPrice = args.currentStopPrice;
  if (args.nextType === "LMT" || args.nextType === "STP LMT") {
    limitPrice = seedLimitPriceFromLast({
      currentLimitPrice: limitPrice,
      planEntry: args.planEntry,
      lastPrice: args.lastPrice,
    });
  }
  if (args.nextType === "STP" || args.nextType === "STP LMT") {
    if (!stopPrice.trim()) {
      const seed = args.planStop ?? args.lastPrice;
      stopPrice =
        seed != null && Number.isFinite(seed) ? formatLimitPriceInput(seed) : stopPrice;
    }
  }
  if (args.nextType === "TRAIL" || args.nextType === "TRAIL LIMIT") {
    if (!stopPrice.trim()) {
      const seed = args.planStop ?? args.lastPrice;
      stopPrice =
        seed != null && Number.isFinite(seed) ? formatLimitPriceInput(seed) : stopPrice;
    }
  }
  if (args.nextType === "TRAIL LIMIT" || args.nextType === "LOC") {
    limitPrice = seedLimitPriceFromLast({
      currentLimitPrice: limitPrice,
      planEntry: args.planEntry,
      lastPrice: args.lastPrice,
    });
  }
  return { limitPrice, stopPrice };
}

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
  if (args.orderType === "MOC") {
    if (args.lastPrice != null && Number.isFinite(args.lastPrice)) {
      return `~${formatPrice(args.lastPrice)} close`;
    }
    return "At close";
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
  entryTrailPercent: string;
  tif: TimeInForce;
  environment: TradingEnvironment;
  outsideRth?: boolean;
  allOrNone?: boolean;
  usePriceMgmtAlgo?: boolean;
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
    allOrNone: args.allOrNone ?? false,
    usePriceMgmtAlgo: args.usePriceMgmtAlgo ?? false,
  };
  if (
    args.orderType === "LMT" ||
    args.orderType === "STP LMT" ||
    args.orderType === "TRAIL LIMIT" ||
    args.orderType === "LOC"
  ) {
    draft.limitPrice = Number.parseFloat(args.limitPrice);
  }
  if (args.orderType === "STP" || args.orderType === "STP LMT") {
    draft.stopPrice = Number.parseFloat(args.stopPrice);
  }
  if (args.orderType === "TRAIL" || args.orderType === "TRAIL LIMIT") {
    const trailAmount = Number.parseFloat(args.stopPrice);
    const trailPct = Number.parseFloat(args.entryTrailPercent);
    if (Number.isFinite(trailAmount) && trailAmount > 0) {
      draft.stopPrice = trailAmount;
    } else if (Number.isFinite(trailPct) && trailPct > 0) {
      draft.trailPercent = trailPct;
    }
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
  seedQuantity = null,
  onSeedQuantityApplied,
  plannedInstance = null,
  onChangePolicy,
  onPlannedRefresh,
  policyTemplates = [],
  selectedPolicyId = null,
  onPolicyChange,
  policyLoading = false,
  policyApplyError = null,
  policyPickerEnabled = false,
  policyDraftPatch = null,
  onPolicyDraftConsumed,
  onPolicyFormContextChange,
  testId = "trade-order-form",
}: TradeOrderFormProps) {
  const account = useAccountOptional();
  const accountAliases = useAccountAliasesOptional();
  const riskSettings = useRiskSettingsOptional();
  const sessionDollarRisk = riskSettings?.dollarRisk ?? null;
  const accountBasisValue = riskSettings?.accountBasisValue ?? null;
  const riskSettingsModel = riskSettings?.settings ?? DEFAULT_RISK_SETTINGS;
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
  const [allOrNone, setAllOrNone] = useState(false);
  const [usePriceMgmtAlgo, setUsePriceMgmtAlgo] = useState(false);
  const [entryTrailPercent, setEntryTrailPercent] = useState("");
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(true);
  const [stopLossEnabled, setStopLossEnabled] = useState(true);
  const [composeTakeProfitPrice, setComposeTakeProfitPrice] = useState<number | null>(null);
  const [composeStopLossPrice, setComposeStopLossPrice] = useState<number | null>(null);
  const [takeProfitQuantity, setTakeProfitQuantity] = useState(1);
  const [stopLossQuantity, setStopLossQuantity] = useState(1);
  const exitQtyCustomRef = useRef(false);
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
  const protectSeedRef = useRef<{ side: OrderSide; entry: number | null }>({
    side: "BUY",
    entry: null,
  });
  const policyBudgetSeedRef = useRef<string | null>(null);
  const [ticketRiskUnit, setTicketRiskUnit] = useState<TicketBudgetUnit>("absolute");
  const [ticketRiskPercent, setTicketRiskPercent] = useState<number | null>(null);
  const [ticketAbsoluteRisk, setTicketAbsoluteRisk] = useState<number | null>(null);

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
    setStopPrice(formatLimitPriceInput(planLevels.stop));
    setComposeStopLossPrice(planLevels.stop);
    setComposeTakeProfitPrice(planLevels.target);
    setStopLossEnabled(true);
    setTakeProfitEnabled(true);
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

  const prevSymbolRef = useRef<string | null>(null);
  useEffect(() => {
    if (!symbol) return;
    if (prevSymbolRef.current != null && prevSymbolRef.current !== symbol) {
      setComposeStopLossPrice(null);
      setComposeTakeProfitPrice(null);
      protectSeedRef.current = { side: "BUY", entry: null };
    }
    prevSymbolRef.current = symbol;
  }, [symbol]);

  const qtyNum = Number.parseFloat(quantity);
  const composeDirection = planLevels?.direction ?? directionFromSide(side);

  const activePolicyTemplate = useMemo((): PlaybookTemplate | null => {
    if (selectedPolicyId) {
      const fromPicker = policyTemplates.find((item) => item.id === selectedPolicyId);
      if (fromPicker) return fromPicker;
    }
    if (plannedInstance) {
      const fromSnapshot = plannedInstance.policySnapshot;
      if (fromSnapshot && fromSnapshot.id === plannedInstance.templateId) {
        return riskPolicyTemplateToPlaybookTemplate(fromSnapshot);
      }
      return getPlaybookPreset(plannedInstance.templateId) ?? null;
    }
    return null;
  }, [plannedInstance, policyTemplates, selectedPolicyId]);

  const draftPolicyActive =
    !policyBound && selectedPolicyId != null && activePolicyTemplate != null;

  useEffect(() => {
    const seedKey = activePolicyTemplate?.id ?? "__session__";
    if (policyBudgetSeedRef.current === seedKey) return;
    policyBudgetSeedRef.current = seedKey;
    const budget = resolvePolicyTicketBudget({
      budget: activePolicyTemplate?.budget,
      sessionSettings: riskSettingsModel,
      accountBasisValue,
      sessionDollarRisk,
    });
    setTicketRiskUnit(budget.unit);
    setTicketRiskPercent(budget.riskPercent);
    setTicketAbsoluteRisk(budget.absoluteRisk);
  }, [accountBasisValue, activePolicyTemplate, riskSettingsModel, sessionDollarRisk]);

  const effectiveTicketDollarRisk = useMemo(
    () =>
      dollarRiskFromTicketRiskInput({
        unit: ticketRiskUnit,
        riskPercent: ticketRiskPercent,
        absoluteRisk: ticketAbsoluteRisk,
        accountBasisValue,
      }),
    [accountBasisValue, ticketAbsoluteRisk, ticketRiskPercent, ticketRiskUnit],
  );

  const resolvedDollarRisk = effectiveTicketDollarRisk ?? sessionDollarRisk;

  useEffect(() => {
    if (!policyDraftPatch) return;
    if (policyDraftPatch.entryQty != null) {
      setQuantity(String(Math.max(1, Math.round(policyDraftPatch.entryQty))));
    }
    setTakeProfitQuantity(policyDraftPatch.takeProfitQuantity);
    setStopLossQuantity(policyDraftPatch.stopQuantity);
    setTakeProfitEnabled(policyDraftPatch.takeProfitEnabled);
    setStopLossEnabled(policyDraftPatch.stopLossEnabled);
    setManagePresetId(policyDraftPatch.manageTemplateId);
    exitQtyCustomRef.current = false;
    if (policyDraftPatch.stopLossPrice != null) {
      setComposeStopLossPrice(policyDraftPatch.stopLossPrice);
    }
    if (policyDraftPatch.takeProfitPrice != null) {
      setComposeTakeProfitPrice(policyDraftPatch.takeProfitPrice);
    }
    onPolicyDraftConsumed?.();
  }, [onPolicyDraftConsumed, policyDraftPatch]);

  useEffect(() => {
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return;
    if (activePolicyTemplate) {
      const derived = deriveProtectExitQuantities(activePolicyTemplate, qtyNum);
      setTakeProfitQuantity(derived.takeProfitQuantity);
      setStopLossQuantity(derived.stopQuantity);
      exitQtyCustomRef.current = false;
      return;
    }
    if (exitQtyCustomRef.current) return;
    const rounded = Math.max(1, Math.round(qtyNum));
    setTakeProfitQuantity(rounded);
    setStopLossQuantity(rounded);
  }, [activePolicyTemplate, policyBound, qtyNum]);

  const exitQtyPlan = useMemo(() => {
    if (!activePolicyTemplate || !Number.isFinite(qtyNum) || qtyNum <= 0) {
      return null;
    }
    return deriveProtectExitQuantities(activePolicyTemplate, qtyNum);
  }, [activePolicyTemplate, qtyNum]);

  const attachBracket = useMemo(() => {
    if (!supportsBracketAttach(orderType)) return false;
    if (policyBound) return true;
    return (
      stopLossEnabled &&
      takeProfitEnabled &&
      composeStopLossPrice != null &&
      composeTakeProfitPrice != null
    );
  }, [
    composeStopLossPrice,
    composeTakeProfitPrice,
    orderType,
    policyBound,
    stopLossEnabled,
    takeProfitEnabled,
  ]);

  const tifOptions = useMemo(
    () =>
      tifOptionsForOrderType(orderType).map((value) => ({
        value,
        label: tifLabel(value),
      })),
    [orderType],
  );

  useEffect(() => {
    if (!isTifValidForOrderType(orderType, tif)) {
      setTif(tifOptionsForOrderType(orderType)[0] ?? "DAY");
    }
  }, [orderType, tif]);

  useEffect(() => {
    if (!supportsPriceMgmtAlgo(orderType) && usePriceMgmtAlgo) {
      setUsePriceMgmtAlgo(false);
    }
  }, [orderType, usePriceMgmtAlgo]);

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
        entryTrailPercent,
        tif,
        environment,
        outsideRth,
        allOrNone,
        usePriceMgmtAlgo,
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
    entryTrailPercent,
    tif,
    environment,
    outsideRth,
    allOrNone,
    usePriceMgmtAlgo,
  ]);

  const runnerManageSteps = useMemo(() => {
    if ((!policyBound && !draftPolicyActive) || !draft || !activePolicyTemplate || composeStopLossPrice == null) {
      return [];
    }
    const entryPrice =
      draft.orderType === "LMT" && draft.limitPrice != null
        ? draft.limitPrice
        : (planLevels?.entry ?? lastPrice ?? 0);
    const plan = lockPositionPlan({
      symbol: draft.symbol,
      accountId: draft.accountId,
      side: draft.side,
      entry: entryPrice,
      initialStop: composeStopLossPrice,
      qty: draft.quantity,
      environment: draft.environment,
    });
    const steps = planPlaybookSteps(activePolicyTemplate, plan);
    const scaleRuleId = exitQtyPlan?.restingScaleRuleId;
    return steps
      .filter((step) => step.ruleId !== scaleRuleId)
      .map((step) => formatManageStepPreview(step));
  }, [
    activePolicyTemplate,
    composeStopLossPrice,
    draft,
    exitQtyPlan?.restingScaleRuleId,
    lastPrice,
    planLevels?.entry,
    policyBound,
    draftPolicyActive,
  ]);

  const stopLeg = useMemo((): BracketStopLeg | null => {
    if (composeStopLossPrice == null) return null;
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
    return buildFixedStopLeg(composeStopLossPrice);
  }, [composeStopLossPrice, stopLegMode, trailAmount, trailPercent]);

  const bracketPlan = useMemo((): BracketPlan | null => {
    if (!draft || !attachBracket || !stopLeg) return null;
    if (composeStopLossPrice == null || composeTakeProfitPrice == null) return null;
    const plan = buildBracketPlanWithPrices({
      entry: draft,
      stopPrice: composeStopLossPrice,
      takeProfitPrice: composeTakeProfitPrice,
      stopLeg,
      takeProfitQuantity: Math.max(1, Math.round(takeProfitQuantity)),
      stopQuantity: Math.max(1, Math.round(stopLossQuantity)),
    });
    return validateBracketGeometry(plan) ? null : plan;
  }, [
    attachBracket,
    composeStopLossPrice,
    composeTakeProfitPrice,
    draft,
    stopLeg,
    stopLossQuantity,
    takeProfitQuantity,
  ]);

  const effectiveManagePresetId: ManagePresetSelection = policyBound
    ? (plannedInstance?.templateId ?? "off")
    : draftPolicyActive && activePolicyTemplate
      ? activePolicyTemplate.id
      : managePresetId;

  const manageEnabled = attachBracket && effectiveManagePresetId !== "off";

  const managePreviewPlan = useMemo(() => {
    if (!draft || !manageEnabled || composeStopLossPrice == null) return null;
    const entryPrice =
      draft.orderType === "LMT" && draft.limitPrice != null
        ? draft.limitPrice
        : (planLevels?.entry ?? lastPrice ?? 0);
    return lockPositionPlan({
      symbol: draft.symbol,
      accountId: draft.accountId,
      side: draft.side,
      entry: entryPrice,
      initialStop: composeStopLossPrice,
      qty: draft.quantity,
      environment: draft.environment,
    });
  }, [composeStopLossPrice, draft, lastPrice, manageEnabled, planLevels?.entry]);

  const managePreviewSteps = useMemo(() => {
    if (!managePreviewPlan || effectiveManagePresetId === "off") return [];
    const template =
      activePolicyTemplate?.id === effectiveManagePresetId
        ? activePolicyTemplate
        : getPlaybookPreset(effectiveManagePresetId);
    if (!template) return [];
    return planPlaybookSteps(template, managePreviewPlan);
  }, [activePolicyTemplate, effectiveManagePresetId, managePreviewPlan]);

  const bracketGeometryError = useMemo(() => {
    if (!draft || !attachBracket || !stopLeg) return null;
    if (composeStopLossPrice == null || composeTakeProfitPrice == null) return null;
    return validateBracketGeometry(
      buildBracketPlanWithPrices({
        entry: draft,
        stopPrice: composeStopLossPrice,
        takeProfitPrice: composeTakeProfitPrice,
        stopLeg,
      }),
    );
  }, [attachBracket, composeStopLossPrice, composeTakeProfitPrice, draft, stopLeg]);

  const proposedRiskForGates = useMemo(() => {
    const entry = planLevels?.entry ?? lastPrice;
    if (
      entry == null ||
      composeStopLossPrice == null ||
      !Number.isFinite(qtyNum) ||
      qtyNum <= 0
    ) {
      return null;
    }
    return plannedRiskDollars(entry, composeStopLossPrice, qtyNum);
  }, [composeStopLossPrice, lastPrice, planLevels?.entry, qtyNum]);

  const accountGates = useAccountRiskGateStatus({
    settings: riskSettingsModel ?? DEFAULT_RISK_SETTINGS,
    accountSummary: account?.summary ?? null,
    pnl: account?.pnl ?? null,
    playbookInstances,
    openPositionCount,
    proposedRiskDollars: proposedRiskForGates ?? resolvedDollarRisk,
  });

  const bracketPlanForPolicy = useMemo(() => {
    if (!policyBound || !draft || composeStopLossPrice == null || composeTakeProfitPrice == null) {
      return null;
    }
    return buildBracketPlanWithPrices({
      entry: draft,
      stopPrice: composeStopLossPrice,
      takeProfitPrice: composeTakeProfitPrice,
      stopLeg: buildFixedStopLeg(composeStopLossPrice),
      takeProfitQuantity: Math.max(1, Math.round(takeProfitQuantity)),
      stopQuantity: Math.max(1, Math.round(stopLossQuantity)),
    });
  }, [
    composeStopLossPrice,
    composeTakeProfitPrice,
    draft,
    policyBound,
    stopLossQuantity,
    takeProfitQuantity,
  ]);

  const submitRiskSummary = useMemo(() => {
    const qty = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null;
    return summarizeSubmitRiskPlanFromBracket({
      environment,
      quantity: qty,
      dollarRisk: resolvedDollarRisk,
      plannedRiskDollars: proposedRiskForGates,
      attachProtect: policyBound ? true : attachBracket,
      bracketPlan: policyBound ? bracketPlanForPolicy : bracketPlan,
      managePresetId: effectiveManagePresetId,
      accountGates: riskSettingsModel != null ? accountGates : null,
      side,
    });
  }, [
    accountGates,
    attachBracket,
    bracketPlan,
    bracketPlanForPolicy,
    resolvedDollarRisk,
    environment,
    effectiveManagePresetId,
    policyBound,
    proposedRiskForGates,
    qtyNum,
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
    if (orderType === "LMT" || orderType === "STP LMT") {
      const parsed = Number.parseFloat(limitPrice);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return planLevels?.entry ?? null;
    }
    if (orderType === "STP") {
      const parsed = Number.parseFloat(stopPrice);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return planLevels?.entry ?? null;
    }
    if (lastPrice != null && Number.isFinite(lastPrice) && lastPrice > 0) return lastPrice;
    return planLevels?.entry ?? null;
  }, [lastPrice, limitPrice, orderType, planLevels?.entry, stopPrice]);

  useEffect(() => {
    onPolicyFormContextChange?.({
      entryQty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1,
      side,
      entryPrice: executableEntry,
      existingStop: composeStopLossPrice,
    });
  }, [
    composeStopLossPrice,
    executableEntry,
    onPolicyFormContextChange,
    qtyNum,
    side,
  ]);

  useEffect(() => {
    if (planLevels) return;
    if (selectedPolicyId) return;
    if (executableEntry == null || !Number.isFinite(executableEntry)) return;
    const defaults = defaultProtectPrices({
      entry: executableEntry,
      direction: directionFromSide(side),
    });
    const seed = protectSeedRef.current;
    const sideChanged = seed.side !== side;
    const needsInitialSeed = seed.entry == null;
    if (sideChanged || needsInitialSeed) {
      setComposeStopLossPrice(defaults.stop);
      setComposeTakeProfitPrice(defaults.target);
      protectSeedRef.current = { side, entry: executableEntry };
    }
  }, [executableEntry, planLevels, selectedPolicyId, side]);

  const effectivePlanLevels = useMemo((): PositionOrderLevels | null => {
    if (composeStopLossPrice == null || composeTakeProfitPrice == null) return null;
    const entry = planLevels?.entry ?? executableEntry;
    if (entry == null || !Number.isFinite(entry)) return null;
    const risk = Math.abs(entry - composeStopLossPrice);
    const reward = Math.abs(composeTakeProfitPrice - entry);
    return {
      direction: composeDirection,
      side,
      entry,
      stop: composeStopLossPrice,
      target: composeTakeProfitPrice,
      riskRewardRatio: risk > 0 ? reward / risk : null,
    };
  }, [
    composeDirection,
    composeStopLossPrice,
    composeTakeProfitPrice,
    executableEntry,
    planLevels?.entry,
    side,
  ]);

  const plannedRisk =
    effectivePlanLevels && Number.isFinite(qtyNum) && qtyNum > 0
      ? plannedRiskDollars(effectivePlanLevels.entry, effectivePlanLevels.stop, qtyNum)
      : null;
  const marketRisk =
    effectivePlanLevels &&
    lastPrice != null &&
    Number.isFinite(lastPrice) &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0
      ? atMarketRiskDollars(
          lastPrice,
          effectivePlanLevels.stop,
          qtyNum,
          effectivePlanLevels.direction,
        )
      : null;

  const protectionEnabled = Boolean(attachBracket && composeStopLossPrice != null && composeTakeProfitPrice != null);

  const orderImpact = useMemo(
    () =>
      computeOrderImpactEconomics({
        quantity: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : null,
        executableEntry,
        stop: protectionEnabled ? composeStopLossPrice : null,
        target: protectionEnabled ? composeTakeProfitPrice : null,
        protectionEnabled,
      }),
    [composeStopLossPrice, composeTakeProfitPrice, executableEntry, protectionEnabled, qtyNum],
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
    if (!attachBracket || composeStopLossPrice == null) return null;
    if (orderType === "MKT" && marketRisk != null) return marketRisk;
    return plannedRisk;
  }, [attachBracket, composeStopLossPrice, marketRisk, orderType, plannedRisk]);

  const showRiskPlan = policyBound || attachBracket || manageEnabled;

  const primaryCtaLabel = useMemo(() => {
    const qty = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0;
    const parsedLimit = Number.parseFloat(limitPrice);
    const parsedStop = Number.parseFloat(stopPrice);
    return summarizeOrderCtaLabel({
      side,
      quantity: qty,
      symbol,
      orderType,
      limitPrice: Number.isFinite(parsedLimit) ? parsedLimit : null,
      stopPrice: Number.isFinite(parsedStop) ? parsedStop : null,
      lastPrice,
      loading,
      schedulePreview: policyBound && scheduleMode !== "now",
    });
  }, [
    lastPrice,
    limitPrice,
    loading,
    orderType,
    policyBound,
    qtyNum,
    scheduleMode,
    side,
    stopPrice,
    symbol,
  ]);

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
    if (!effectivePlanLevels || !attachBracket) return null;
    const parts = [
      `Stop ${formatPrice(effectivePlanLevels.stop)}`,
      `Target ${formatPrice(effectivePlanLevels.target)}`,
    ];
    if (activeRiskDollars != null) {
      parts.push(`Risk ${formatMoney(activeRiskDollars)}`);
    }
    if (effectivePlanLevels.riskRewardRatio != null) {
      parts.push(`R:R ${effectivePlanLevels.riskRewardRatio.toFixed(1)}`);
    }
    return parts.join(" · ");
  }, [activeRiskDollars, attachBracket, effectivePlanLevels]);

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
          takeProfitPrice: composeTakeProfitPrice ?? planLevels?.target,
          takeProfitQuantity: Math.max(1, Math.round(takeProfitQuantity)),
          stopQuantity: Math.max(1, Math.round(stopLossQuantity)),
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

    if (attachBracket && !bracketPlan) {
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
                playbookTemplateId: effectiveManagePresetId,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid={testId}>
      {error ? (
        <p className="mx-3 mt-3 text-xs text-[var(--edge-negative)]" role="alert">
          {error}
        </p>
      ) : null}

      {step === "form" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 text-xs">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
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
            {policyPickerEnabled && onPolicyChange ? (
              <TradePolicyPicker
                templates={policyTemplates}
                value={selectedPolicyId}
                onChange={onPolicyChange}
                disabled={!policyPickerEnabled}
                loading={policyLoading}
              />
            ) : null}
          </div>
          {policyApplyError ? (
            <p className="mb-3 text-[10px] text-[var(--edge-negative)]" role="alert">
              {policyApplyError}
            </p>
          ) : null}

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

          <div className="mb-3">
            <BuySellToggle
              side={side}
              onChange={setSide}
              lastPrice={lastPrice}
              formatLast={formatPrice}
              testId="trade-buy-sell-toggle"
            />
          </div>

          <div className="mb-3 w-full" data-testid="trade-order-type-tabs">
            <EdgeUnderlineTabs
              layout="stretch"
              segments={ORDER_TYPE_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
              }))}
              value={orderType}
              onChange={(value) => {
                const next = value as OrderType;
                const seeded = handleOrderTypeTabChange({
                  nextType: next,
                  planEntry: planLevels?.entry ?? null,
                  planStop: planLevels?.stop ?? null,
                  lastPrice,
                  currentLimitPrice: limitPrice,
                  currentStopPrice: stopPrice,
                });
                setOrderType(next);
                setLimitPrice(seeded.limitPrice);
                setStopPrice(seeded.stopPrice);
              }}
            />
          </div>

          {orderType === "MKT" || orderType === "MOC" ? (
            <div className="mb-3">
              <div className="text-center text-[10px] text-[var(--edge-text-secondary)]">
                Order Price
              </div>
              <div
                className="mt-1 text-center font-mono text-[var(--edge-text-strong)]"
                data-testid="trade-entry-display"
              >
                {displayEntry}
              </div>
            </div>
          ) : null}

          {orderType === "LMT" ||
          orderType === "STP LMT" ||
          orderType === "TRAIL LIMIT" ||
          orderType === "LOC" ? (
            <div className="mb-3">
              <EdgeLabeledInput
                label={orderType === "LOC" ? "Limit Price" : "Order Price"}
                type="number"
                min={0}
                step="0.01"
                value={limitPrice}
                onChange={(event) => setLimitPrice(event.target.value)}
                density="compact"
                testId="trade-limit-price"
              />
            </div>
          ) : null}

          {orderType === "STP" || orderType === "STP LMT" ? (
            <div className="mb-3">
              <EdgeLabeledInput
                label={orderType === "STP LMT" ? "Stop Price" : "Order Price"}
                type="number"
                min={0}
                step="0.01"
                value={stopPrice}
                onChange={(event) => setStopPrice(event.target.value)}
                density="compact"
                testId="trade-stop-price"
              />
            </div>
          ) : null}

          {orderType === "TRAIL" || orderType === "TRAIL LIMIT" ? (
            <div className="mb-3 space-y-2">
              <EdgeLabeledInput
                label="Trail amount ($)"
                type="number"
                min={0}
                step="0.01"
                value={stopPrice}
                onChange={(event) => setStopPrice(event.target.value)}
                density="compact"
                testId="trade-trail-amount"
              />
              <EdgeLabeledInput
                label="Trail %"
                type="number"
                min={0}
                step="0.01"
                value={entryTrailPercent}
                onChange={(event) => setEntryTrailPercent(event.target.value)}
                density="compact"
                testId="trade-trail-percent"
              />
            </div>
          ) : null}

          {supportsPriceMgmtAlgo(orderType) ? (
            <label className="mb-3 flex items-center gap-2 text-[10px] text-[var(--edge-text-secondary)]">
              <input
                type="checkbox"
                checked={usePriceMgmtAlgo}
                onChange={(event) => setUsePriceMgmtAlgo(event.target.checked)}
                data-testid="trade-price-mgmt-algo"
              />
              Price mgmt algo
            </label>
          ) : null}

          <div className="mb-3">
            <TradeSizeBudgetField
              quantity={Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1}
              onQuantityChange={(nextQty) => setQuantity(String(nextQty))}
              riskUnit={ticketRiskUnit}
              onRiskUnitChange={setTicketRiskUnit}
              riskPercent={ticketRiskPercent}
              absoluteRisk={ticketAbsoluteRisk}
              onRiskPercentChange={setTicketRiskPercent}
              onAbsoluteRiskChange={setTicketAbsoluteRisk}
              entry={executableEntry}
              stop={composeStopLossPrice}
              accountBasisValue={accountBasisValue}
              riskDisabled={ticketRiskUnit === "percent" && accountBasisValue == null}
            />
          </div>

          {supportsBracketAttach(orderType) || policyBound ? (
            <div className="mb-3">
              <LinkedProtectLevelsEditor
                entry={executableEntry}
                quantity={Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0}
                direction={composeDirection}
                takeProfitEnabled={takeProfitEnabled}
                onTakeProfitEnabledChange={(enabled) => {
                  setTakeProfitEnabled(enabled);
                  if (!enabled) setManagePresetId("off");
                }}
                takeProfitPrice={composeTakeProfitPrice}
                onTakeProfitPriceChange={setComposeTakeProfitPrice}
                takeProfitQuantity={takeProfitQuantity}
                onTakeProfitQuantityChange={(value) => {
                  exitQtyCustomRef.current = true;
                  setTakeProfitQuantity(value);
                }}
                stopLossEnabled={stopLossEnabled}
                onStopLossEnabledChange={setStopLossEnabled}
                stopLossPrice={composeStopLossPrice}
                onStopLossPriceChange={setComposeStopLossPrice}
                stopLossQuantity={stopLossQuantity}
                onStopLossQuantityChange={(value) => {
                  exitQtyCustomRef.current = true;
                  setStopLossQuantity(value);
                }}
              />
            </div>
          ) : (
            <p
              className="mb-3 text-[10px] text-[var(--edge-text-secondary)]"
              data-testid="trade-protect-unavailable"
            >
              Attach orders available for Market and Limit entry only.
            </p>
          )}

          {exitQtyPlan && exitQtyPlan.runnerQuantity > 0 && (policyBound || draftPolicyActive) ? (
            <div
              className="mb-3 space-y-1 rounded border border-[var(--edge-border)] px-2 py-2 text-[10px]"
              data-testid="trade-exit-plan"
            >
              <div className="uppercase tracking-wide text-[var(--edge-text-secondary)]">
                Runner · {exitQtyPlan.runnerQuantity} sh
              </div>
              {runnerManageSteps.map((line) => (
                <div key={line} className="text-[var(--edge-text-secondary)]">
                  {line}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mb-3 space-y-1.5" data-testid="trade-session-row">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 text-[10px] text-[var(--edge-text-secondary)]">
                  Time in Force
                </span>
                <EdgeHelpIcon
                  content={SESSION_FIELD_HELP.tif}
                  ariaLabel="Time in Force help"
                  side="top"
                />
              </div>
              <EdgeSelect
                value={tif}
                onChange={(value) => setTif(value as TimeInForce)}
                options={tifOptions}
                density="compact"
                variant="chip"
                aria-label="Time in Force"
                testId="trade-tif"
                className="min-w-[4.5rem]"
                minWidth={120}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                <span className="text-[10px] text-[var(--edge-text-secondary)]">All or none</span>
                <EdgeHelpIcon
                  content={SESSION_FIELD_HELP.allOrNone}
                  ariaLabel="All or none help"
                  side="top"
                />
              </div>
              <EdgeToggleSwitch
                checked={allOrNone}
                onChange={setAllOrNone}
                size="compact"
                ariaLabel="All or none"
                testId="trade-all-or-none"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                <span className="text-[10px] text-[var(--edge-text-secondary)]">
                  Extended hours
                </span>
                <EdgeHelpIcon
                  content={SESSION_FIELD_HELP.extendedHours}
                  ariaLabel="Extended hours help"
                  side="top"
                />
              </div>
              <EdgeToggleSwitch
                checked={outsideRth}
                onChange={setOutsideRth}
                size="compact"
                ariaLabel="Allow extended hours"
                testId="trade-outside-rth"
              />
            </div>
          </div>

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

          {attachBracket && !policyBound ? (
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
                  !policyBound && !attachBracket
                    ? () => {
                        setStopLossEnabled(true);
                        setTakeProfitEnabled(true);
                      }
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
