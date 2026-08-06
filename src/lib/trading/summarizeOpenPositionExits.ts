import type { AccountOrder, AccountPosition } from "@/lib/marketData/contracts/brokerage";
import {
  formatCompletedManageRules,
  formatNextManageActionPreview,
  formatNextManageDistance,
  formatPlaybookManageLabel,
  resolveManagePauseMessage,
} from "@/lib/trading/playbook/display";
import { isProtectiveStopOrder } from "@/lib/trading/playbook/resolveStopOrder";
import type {
  PlaybookInstance,
  PlaybookInstanceStatus,
} from "@/lib/trading/playbook/types";
import { SUBMIT_RISK_FAILURE_MODE_COPY } from "@/lib/risk/summarizeSubmitRiskPlan";

export type OpenPositionProtectKind = "unprotected" | "stop" | "trail" | "oco" | "stop_tp";

export type OpenPositionExitWarning = "unprotected" | "manage_without_protect";

const ACTIVE_MANAGE_STATUSES: PlaybookInstanceStatus[] = [
  "armed",
  "paused",
  "pending_fill",
];

export type OpenPositionExitsSummary = {
  protect: {
    attached: boolean;
    kind: OpenPositionProtectKind;
    label: string;
  };
  manage: {
    attached: boolean;
    label: string;
    nextDistance: string | null;
    nextActionPreview: string | null;
    completedLabels: string[];
    pauseMessage: string | null;
  };
  warnings: OpenPositionExitWarning[];
};

export const OPEN_POSITION_UNPROTECTED_COPY =
  "No resting broker stop — position is unprotected if Edge is down.";

export const OPEN_POSITION_MANAGE_WITHOUT_PROTECT_COPY =
  "Manage is armed but no resting broker stop — position is unprotected if Edge is down.";

export { SUBMIT_RISK_FAILURE_MODE_COPY as OPEN_POSITION_FAILURE_MODE_COPY };

export const DETACH_MANAGE_HINT = "Detach Manage only — broker Protect stays live.";

export const PAUSE_MANAGE_HINT = "Pause Manage only — broker Protect stays live.";

export function isActiveManageInstance(instance: PlaybookInstance | null | undefined): boolean {
  if (!instance) return false;
  return ACTIVE_MANAGE_STATUSES.includes(instance.status);
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeSymbol(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function normalizeAction(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function closingActionForPosition(qty: number): "BUY" | "SELL" {
  return qty > 0 ? "SELL" : "BUY";
}

function matchesPositionOrder(
  order: AccountOrder,
  symbol: string,
  accountId: string | null,
): boolean {
  if (normalizeSymbol(order.symbol) !== symbol) return false;
  const orderAccount = order.account?.trim();
  if (accountId && orderAccount && orderAccount !== accountId) return false;
  return true;
}

function isTakeProfitLimitOrder(order: AccountOrder): boolean {
  const orderType = order.orderType?.trim().toUpperCase() ?? "";
  return orderType === "LMT" || orderType === "LMT MOC";
}

function isTrailOrder(order: AccountOrder): boolean {
  const orderType = order.orderType?.trim().toUpperCase() ?? "";
  return orderType === "TRAIL" || orderType.includes("TRAIL");
}

function resolveStopPrice(order: AccountOrder): number | null {
  if (isTrailOrder(order)) return null;
  const aux = order.auxPrice;
  if (aux != null && Number.isFinite(aux)) return aux;
  const lmt = order.lmtPrice;
  if (lmt != null && Number.isFinite(lmt) && isProtectiveStopOrder(order)) return lmt;
  return null;
}

export type OpenPositionProtectStop = {
  kind: "stop" | "trail" | null;
  stopPrice: number | null;
  trailAmount: number | null;
};

/** Resolve resting protect stop for open-position economics (stop price or trail amount). */
export function resolveOpenPositionProtectStop(args: {
  position: AccountPosition;
  orders: AccountOrder[];
  manageInstance?: PlaybookInstance | null;
}): OpenPositionProtectStop {
  const symbol = normalizeSymbol(args.position.contract.symbol);
  const qty = args.position.position ?? 0;
  const accountId = args.position.account?.trim() ?? null;
  const closingAction = closingActionForPosition(qty);

  const stopOrder = resolvePrimaryStopOrder({
    orders: args.orders,
    symbol,
    accountId,
    closingAction,
    manageInstance: args.manageInstance,
  });

  if (!stopOrder) {
    return { kind: null, stopPrice: null, trailAmount: null };
  }

  if (isTrailOrder(stopOrder)) {
    const trailAmount = stopOrder.auxPrice;
    return {
      kind: "trail",
      stopPrice: null,
      trailAmount: trailAmount != null && Number.isFinite(trailAmount) ? trailAmount : null,
    };
  }

  return {
    kind: "stop",
    stopPrice: resolveStopPrice(stopOrder),
    trailAmount: null,
  };
}

export function formatProtectOrderLabel(stopOrder: AccountOrder, takeProfitOrder?: AccountOrder | null): string {
  if (isTrailOrder(stopOrder)) {
    const trailAmount = stopOrder.auxPrice;
    if (trailAmount != null && Number.isFinite(trailAmount)) {
      return `TRAIL $${trailAmount}`;
    }
    return "TRAIL";
  }

  const stopPrice = resolveStopPrice(stopOrder);
  const stopLabel = stopPrice != null ? `STP ${formatPrice(stopPrice)}` : "STP";

  if (takeProfitOrder?.lmtPrice != null && Number.isFinite(takeProfitOrder.lmtPrice)) {
    return `${stopLabel} · TP ${formatPrice(takeProfitOrder.lmtPrice)}`;
  }

  return stopLabel;
}

function findTakeProfitPeer(
  stopOrder: AccountOrder,
  candidates: AccountOrder[],
): AccountOrder | null {
  const ocaGroup = stopOrder.ocaGroup?.trim();
  if (ocaGroup) {
    const peer = candidates.find(
      (order) =>
        order.orderId !== stopOrder.orderId &&
        order.ocaGroup?.trim() === ocaGroup &&
        isTakeProfitLimitOrder(order),
    );
    if (peer) return peer;
  }

  if (stopOrder.parentId != null) {
    const sibling = candidates.find(
      (order) =>
        order.parentId === stopOrder.parentId &&
        order.orderId !== stopOrder.orderId &&
        isTakeProfitLimitOrder(order),
    );
    if (sibling) return sibling;
  }

  return null;
}

function resolvePrimaryStopOrder(args: {
  orders: AccountOrder[];
  symbol: string;
  accountId: string | null;
  closingAction: "BUY" | "SELL";
  manageInstance?: PlaybookInstance | null;
}): AccountOrder | null {
  const { orders, symbol, accountId, closingAction, manageInstance } = args;
  const positionOrders = orders.filter((order) => matchesPositionOrder(order, symbol, accountId));

  if (manageInstance?.stopOrderId != null) {
    const cached = positionOrders.find((order) => order.orderId === manageInstance.stopOrderId);
    if (cached && isProtectiveStopOrder(cached)) return cached;
  }

  const protectiveStops = positionOrders.filter(
    (order) =>
      isProtectiveStopOrder(order) && normalizeAction(order.action) === closingAction,
  );

  if (protectiveStops.length === 0) return null;

  return protectiveStops.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null;
}

function resolveProtectKind(
  stopOrder: AccountOrder,
  takeProfitOrder: AccountOrder | null,
): OpenPositionProtectKind {
  if (takeProfitOrder) return "stop_tp";
  if (stopOrder.ocaGroup?.trim()) return "oco";
  if (isTrailOrder(stopOrder)) return "trail";
  return "stop";
}

export function summarizeOpenPositionExits(args: {
  position: AccountPosition;
  orders: AccountOrder[];
  manageInstance?: PlaybookInstance | null;
  lastPrice?: number | null;
}): OpenPositionExitsSummary {
  const symbol = normalizeSymbol(args.position.contract.symbol);
  const qty = args.position.position ?? 0;
  const accountId = args.position.account?.trim() ?? null;
  const closingAction = closingActionForPosition(qty);

  const positionOrders = args.orders.filter((order) =>
    matchesPositionOrder(order, symbol, accountId),
  );

  const stopOrder = resolvePrimaryStopOrder({
    orders: args.orders,
    symbol,
    accountId,
    closingAction,
    manageInstance: args.manageInstance,
  });

  const takeProfitOrder = stopOrder ? findTakeProfitPeer(stopOrder, positionOrders) : null;

  const protectAttached = stopOrder != null;
  const protectKind: OpenPositionProtectKind = protectAttached
    ? resolveProtectKind(stopOrder, takeProfitOrder)
    : "unprotected";
  const protectLabel = protectAttached
    ? formatProtectOrderLabel(stopOrder, takeProfitOrder)
    : "Unprotected";

  const manageInstance = args.manageInstance;
  const manageAttached = manageInstance != null;
  const manageLabel = manageAttached
    ? formatPlaybookManageLabel(manageInstance)
    : "Off";
  const lastPrice = args.lastPrice ?? args.position.marketPrice ?? null;
  const nextDistance =
    manageAttached
      ? formatNextManageDistance(manageInstance, lastPrice)
      : null;
  const nextActionPreview =
    manageAttached
      ? formatNextManageActionPreview(manageInstance)
      : null;
  const completedLabels =
    manageAttached && args.manageInstance
      ? formatCompletedManageRules(args.manageInstance)
      : [];
  const pauseMessage =
    manageAttached && args.manageInstance
      ? resolveManagePauseMessage(args.manageInstance)
      : null;

  const manageActive = isActiveManageInstance(args.manageInstance);
  const warnings: OpenPositionExitWarning[] = protectAttached
    ? []
    : manageActive
      ? ["manage_without_protect"]
      : ["unprotected"];

  return {
    protect: {
      attached: protectAttached,
      kind: protectKind,
      label: protectLabel,
    },
    manage: {
      attached: manageAttached,
      label: manageLabel,
      nextDistance,
      nextActionPreview,
      completedLabels,
      pauseMessage,
    },
    warnings,
  };
}

export function openPositionExitWarningLabel(warning: OpenPositionExitWarning): string {
  switch (warning) {
    case "unprotected":
      return OPEN_POSITION_UNPROTECTED_COPY;
    case "manage_without_protect":
      return OPEN_POSITION_MANAGE_WITHOUT_PROTECT_COPY;
    default:
      return warning;
  }
}
