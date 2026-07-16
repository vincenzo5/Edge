"use client";

import { useMemo, useState } from "react";
import { useAccount } from "../../AccountProvider";
import { useAccountAliases } from "../../AccountAliasesProvider";
import { useChartActions } from "../../ChartActionsContext";
import { parseSummaryTagNumber, formatExecutionLabel } from "@/lib/marketData/contracts/brokerage";
import type { AccountOrder, AccountPosition } from "@/lib/marketData/contracts/brokerage";
import EdgeIconButton from "../../design-system/EdgeIconButton";
import { EdgeButton } from "../../design-system";
import Tooltip from "../../Tooltip";
import { PanelPopOutButton } from "../PanelChromeActions";
import { cancelOrder, TradingApiError } from "@/lib/trading/tradingClient";
import { isOrderCancellable } from "@/lib/trading/orderStatus";
import { filterOpenOrders, sortOrdersNewestFirst } from "@/lib/brokerage/filterOrders";

function formatMoney(value: number | null | undefined, currency = "USD"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function relativeUpdatedAt(ts: number | null | undefined): string {
  if (!ts) return "—";
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  if (mins < 1) return "just now";
  return `${mins}m ago`;
}

function pnlColorClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return value > 0 ? "text-[var(--edge-positive)]" : "text-[var(--edge-negative)]";
}

const METRIC_HELP: Record<string, string> = {
  "Net liquidation":
    "Total portfolio value if all positions were liquidated at current market prices.",
  "Buying power": "Cash available to spend on new positions without depositing more funds.",
  "Available funds":
    "Funds available to withdraw or trade without exceeding margin requirements.",
  "Excess liquidity":
    "Equity in excess of maintenance margin; a buffer before margin call.",
  "Init margin": "Initial margin requirement — what opening new positions would cost.",
  "Maint margin": "Maintenance margin requirement to keep current positions open.",
  Leverage: "Initial margin divided by net liquidation.",
  "Day trades": "Pattern day trader day trades remaining before restrictions apply.",
};

type PositionFilter = "all" | "long" | "short";
type OrdersTab = "orders" | "fills" | "history";

function HelpIcon({ help }: { help: string }) {
  return (
    <Tooltip content={help} theme="dark" side="right" portaled>
      <span
        className="inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-[var(--edge-border)] text-[8px] leading-none"
        aria-label="Help"
      >
        ?
      </span>
    </Tooltip>
  );
}

function PositionRow({
  row,
  onSelect,
}: {
  row: AccountPosition;
  onSelect: (symbol: string) => void;
}) {
  const symbol = row.contract.symbol ?? "—";
  const qty = row.position ?? 0;
  const pnl = row.unrealizedPNL;
  const pnlClass = pnlColorClass(pnl);

  return (
    <button
      type="button"
      className="grid w-full grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,0.75fr))] gap-2 border-b border-[var(--edge-border)] px-2 py-1.5 text-left text-[11px] hover:bg-[var(--edge-surface-hover)]"
      onClick={() => onSelect(symbol)}
    >
      <span className="truncate font-medium text-[var(--edge-text-strong)]">{symbol}</span>
      <span className={qty < 0 ? "text-[var(--edge-negative)]" : ""}>{qty}</span>
      <span>{formatMoney(row.avgCost)}</span>
      <span>{formatMoney(row.marketPrice)}</span>
      <span className={pnlClass}>{formatMoney(pnl)}</span>
    </button>
  );
}

function toggleButtonClass(active: boolean): string {
  return active
    ? "rounded bg-[var(--edge-surface-active)] px-1.5 py-0.5"
    : "rounded px-1.5 py-0.5 hover:bg-[var(--edge-surface-hover)]";
}

function OrderRow({
  order,
  showCancel = false,
  cancelling = false,
  onCancel,
}: {
  order: AccountOrder;
  showCancel?: boolean;
  cancelling?: boolean;
  onCancel?: () => void;
}) {
  const canCancel =
    showCancel && isOrderCancellable(order.status) && order.orderId != null && onCancel;

  return (
    <div className="rounded border border-[var(--edge-border)] px-2 py-1">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">
          {order.symbol} · {order.action} {order.totalQuantity} · {order.orderType}
        </div>
        {canCancel ? (
          <EdgeButton
            theme="dark"
            className="!px-2 !py-0.5 text-[10px]"
            disabled={cancelling}
            onClick={onCancel}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </EdgeButton>
        ) : null}
      </div>
      <div className="text-[var(--edge-text-secondary)]">
        {order.status?.trim() || "Open"} · filled {order.filled ?? 0}/{order.totalQuantity ?? 0}
        {order.lmtPrice != null ? ` · lmt ${order.lmtPrice}` : ""}
        {order.orderRef ? ` · ref ${order.orderRef}` : ""}
      </div>
    </div>
  );
}

export function AccountPanel() {
  const account = useAccount();
  const { displayNameFor } = useAccountAliases();
  const chartActions = useChartActions();
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [ordersTab, setOrdersTab] = useState<OrdersTab>("orders");
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const tags = account.summary?.tags ?? {};
  const netLiq = parseSummaryTagNumber(tags, "NetLiquidation");
  const buyingPower = parseSummaryTagNumber(tags, "BuyingPower");
  const availableFunds = parseSummaryTagNumber(tags, "AvailableFunds");
  const excessLiquidity = parseSummaryTagNumber(tags, "ExcessLiquidity");
  const initMargin = parseSummaryTagNumber(tags, "InitMarginReq");
  const maintMargin = parseSummaryTagNumber(tags, "MaintMarginReq");
  const dayTrades = parseSummaryTagNumber(tags, "DayTradesRemaining");
  const accountTitle = account.activeTradingAccount
    ? displayNameFor(account.activeTradingAccount)
    : account.activeTradingAccountId ?? account.status?.accountId ?? "Account";
  const dailyPnl = account.pnl?.dailyPnL ?? null;
  const leverage =
    initMargin != null && netLiq != null && netLiq !== 0 ? initMargin / netLiq : null;

  const filteredPositions = useMemo(() => {
    let rows = [...account.positions];
    if (positionFilter === "long") rows = rows.filter((r) => (r.position ?? 0) > 0);
    if (positionFilter === "short") rows = rows.filter((r) => (r.position ?? 0) < 0);
    rows.sort((a, b) => Math.abs(b.marketValue ?? 0) - Math.abs(a.marketValue ?? 0));
    return rows;
  }, [account.positions, positionFilter]);

  const openOrders = useMemo(
    () => filterOpenOrders(account.ordersForActiveAccount),
    [account.ordersForActiveAccount],
  );

  const orderHistory = useMemo(
    () => sortOrdersNewestFirst(account.ordersForActiveAccount),
    [account.ordersForActiveAccount],
  );

  const handleSelectSymbol = (symbol: string) => {
    chartActions?.loadSymbolIntoActiveChart({
      symbol,
      name: symbol,
      exchange: "",
    });
  };

  const handleCancelOrder = async (order: AccountOrder) => {
    const orderId = order.orderId;
    const accountId = order.account?.trim() || account.activeTradingAccountId?.trim();
    if (orderId == null || !accountId) {
      setCancelError("Cannot cancel order without account id.");
      return;
    }
    setCancellingOrderId(orderId);
    setCancelError(null);
    try {
      await cancelOrder(orderId, accountId, {
        environment: account.tradingEnvironment,
        liveConfirmation:
          account.tradingEnvironment === "live" ? "LIVE" : undefined,
      });
      await account.refresh();
    } catch (error) {
      setCancelError(
        error instanceof TradingApiError ? error.message : "Cancel failed. Try again.",
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (account.disabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-[var(--edge-text-secondary)]">
        <p>Account tracking is unavailable.</p>
        <p>Start IB Gateway and the TWS sidecar, then retry.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-[var(--edge-text-primary)]">
      <header className="border-b border-[var(--edge-border)] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[var(--edge-text-strong)]">
              {accountTitle}
            </div>
            <div className="text-[10px] text-[var(--edge-text-secondary)]">
              {account.connectionState === "connected" ? "Connected" : account.connectionState}
              {" · "}
              updated {relativeUpdatedAt(account.summary?.updatedAt)}
              {account.tradingEnvironment === "live" ? " · updates every 15s" : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PanelPopOutButton label="Pop out" />
            <EdgeIconButton
            theme="dark"
            aria-label="Refresh account"
            onClick={() => void account.refresh()}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M2 8a6 6 0 1 0 1.5-3.97"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 2v3h3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </EdgeIconButton>
          </div>
        </div>
        {account.error ? (
          <p className="mt-1 text-[10px] text-[var(--edge-negative)]">{account.error}</p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="grid grid-cols-2 gap-2 px-3 py-3">
          <div className="col-span-2 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1 text-[10px] uppercase text-[var(--edge-text-secondary)]">
                <span>Net liquidation</span>
                <HelpIcon help={METRIC_HELP["Net liquidation"]} />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-[9px] uppercase text-[var(--edge-text-secondary)]">
                  <span>Day trades</span>
                  <HelpIcon help={METRIC_HELP["Day trades"]} />
                </div>
                <div className="text-[11px] font-medium">{dayTrades?.toString() ?? "—"}</div>
              </div>
            </div>
            <div className="text-lg font-semibold">{formatMoney(netLiq)}</div>
            <div className={`text-[11px] ${pnlColorClass(dailyPnl)}`}>
              Daily PnL {formatMoney(dailyPnl)}
            </div>
          </div>
          <MetricTile label="Buying power" value={formatMoney(buyingPower)} />
          <MetricTile label="Available funds" value={formatMoney(availableFunds)} />
          <MetricTile label="Excess liquidity" value={formatMoney(excessLiquidity)} />
          <MetricTile label="Init margin" value={formatMoney(initMargin)} />
          <MetricTile label="Maint margin" value={formatMoney(maintMargin)} />
          <MetricTile
            label="Leverage"
            value={leverage != null ? leverage.toFixed(2) : "—"}
          />
        </section>

        <section className="border-t border-[var(--edge-border)] px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[var(--edge-text-strong)]">Positions</h3>
            <div className="flex gap-1 text-[10px]">
              {(["all", "long", "short"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={toggleButtonClass(positionFilter === filter)}
                  onClick={() => setPositionFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          {filteredPositions.length === 0 ? (
            <p className="text-[11px] text-[var(--edge-text-secondary)]">No open positions.</p>
          ) : (
            <div>
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,0.75fr))] gap-2 px-2 pb-1 text-[10px] uppercase text-[var(--edge-text-secondary)]">
                <span>Symbol</span>
                <span>Qty</span>
                <span>Avg</span>
                <span>Mkt</span>
                <span>PnL</span>
              </div>
              {filteredPositions.map((row, index) => (
                <PositionRow
                  key={`${row.contract.conId ?? row.contract.symbol}-${index}`}
                  row={row}
                  onSelect={handleSelectSymbol}
                />
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-[var(--edge-border)] px-3 py-2">
          <div className="mb-2 flex flex-wrap gap-2 text-[10px]">
            {(
              [
                ["orders", "Open orders"],
                ["fills", "Today's fills"],
                ["history", "Order history"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                className={toggleButtonClass(ordersTab === tab)}
                onClick={() => setOrdersTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>
          {ordersTab === "orders" ? (
            !account.activeTradingAccountId ? (
              <p className="text-[11px] text-[var(--edge-text-secondary)]">
                No active trading account selected.
              </p>
            ) : openOrders.length === 0 ? (
              <p className="text-[11px] text-[var(--edge-text-secondary)]">No open orders.</p>
            ) : (
              <div className="space-y-1 text-[11px]">
                {cancelError ? (
                  <p className="text-[10px] text-[var(--edge-negative)]">{cancelError}</p>
                ) : null}
                {openOrders.map((order) => (
                  <OrderRow
                    key={order.orderId ?? order.permId ?? `${order.symbol}-${order.updatedAt}`}
                    order={order}
                    showCancel
                    cancelling={cancellingOrderId === order.orderId}
                    onCancel={() => void handleCancelOrder(order)}
                  />
                ))}
              </div>
            )
          ) : ordersTab === "history" ? (
            !account.activeTradingAccountId ? (
              <p className="text-[11px] text-[var(--edge-text-secondary)]">
                No active trading account selected.
              </p>
            ) : orderHistory.length === 0 ? (
              <p className="text-[11px] text-[var(--edge-text-secondary)]">No order history yet.</p>
            ) : (
              <div className="space-y-1 text-[11px]">
                {orderHistory.map((order) => (
                  <OrderRow
                    key={order.orderId ?? order.permId ?? `${order.symbol}-${order.updatedAt}`}
                    order={order}
                  />
                ))}
              </div>
            )
          ) : account.executions.length === 0 ? (
            <p className="text-[11px] text-[var(--edge-text-secondary)]">No fills yet.</p>
          ) : (
            <div className="space-y-1 text-[11px]">
              {account.executions.slice(0, 20).map((fill) => (
                <div
                  key={fill.execId ?? `${fill.symbol}-${fill.time}-${fill.price}`}
                  className="rounded border border-[var(--edge-border)] px-2 py-1"
                >
                  <div className="font-medium">
                    {formatExecutionLabel(fill)}
                  </div>
                  <div className="text-[var(--edge-text-secondary)]">
                    {fill.time}
                    {fill.commission != null ? ` · comm ${formatMoney(fill.commission)}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  const help = METRIC_HELP[label];
  return (
    <div className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase text-[var(--edge-text-secondary)]">
        <span>{label}</span>
        {help ? <HelpIcon help={help} /> : null}
      </div>
      <div className="text-xs font-medium">{value}</div>
    </div>
  );
}
