import "server-only";

import type { BrokerageSnapshot } from "@/lib/brokerage/brokerageService";
import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import { buildClosePositionDraft } from "@/lib/trading/closePositionDraft";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";
import type { TradingEnvironment } from "@/lib/trading/types";

export function ordersCorrelatedWithInstance(
  instance: PlaybookInstance,
  orders: AccountOrder[],
): AccountOrder[] {
  const symbol = instance.positionPlan.symbol.trim().toUpperCase();
  const accountId = instance.positionPlan.accountId.trim();
  const orderRef = instance.orderRef?.trim();
  const closingAction = instance.positionPlan.side === "BUY" ? "SELL" : "BUY";

  return orders.filter((order) => {
    if (order.symbol?.trim().toUpperCase() !== symbol) return false;
    if (order.account?.trim() && order.account.trim() !== accountId) return false;
    const status = order.status?.trim().toLowerCase() ?? "";
    if (status === "filled" || status === "cancelled" || status === "inactive") {
      return false;
    }
    if (orderRef && order.orderRef?.startsWith(orderRef)) return true;
    if (instance.stopOrderId != null && order.orderId === instance.stopOrderId) return true;
    if (instance.takeProfitOrderId != null && order.orderId === instance.takeProfitOrderId) {
      return true;
    }
    const orderType = order.orderType?.trim().toUpperCase() ?? "";
    const isProtective =
      orderType.includes("STP") || orderType === "TRAIL" || orderType.includes("TRAIL");
    return isProtective && order.action?.trim().toUpperCase() === closingAction;
  });
}

export function positionQtyForInstance(
  instance: PlaybookInstance,
  snapshot: BrokerageSnapshot,
): number {
  const symbol = instance.positionPlan.symbol.trim().toUpperCase();
  const accountId = instance.positionPlan.accountId.trim();
  const row = snapshot.positions.find(
    (item) =>
      item.contract.symbol?.trim().toUpperCase() === symbol &&
      (!item.account || item.account === accountId),
  );
  return row?.position ?? 0;
}

export function buildFlattenDraftForInstance(
  instance: PlaybookInstance,
  snapshot: BrokerageSnapshot,
) {
  const symbol = instance.positionPlan.symbol.trim().toUpperCase();
  const accountId = instance.positionPlan.accountId.trim();
  const row = snapshot.positions.find(
    (item) =>
      item.contract.symbol?.trim().toUpperCase() === symbol &&
      (!item.account || item.account === accountId),
  );
  if (!row) return null;
  return buildClosePositionDraft({
    position: row,
    account: { accountId, environment: instance.positionPlan.environment },
  });
}

export function isEmergencyExitAllowed(environment: TradingEnvironment): boolean {
  void environment;
  return true;
}
