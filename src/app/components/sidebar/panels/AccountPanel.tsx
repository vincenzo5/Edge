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
import ContextMenu, { type ContextMenuItem } from "../../ContextMenu";
import { PanelPopOutButton } from "../PanelChromeActions";
import { cancelOrder, TradingApiError } from "@/lib/trading/tradingClient";
import { isOrderCancellable } from "@/lib/trading/orderStatus";
import { filterOpenOrders, sortOrdersNewestFirst } from "@/lib/brokerage/filterOrders";
import { resolveAccountPanelHeader } from "@/lib/trading/accountPanelHeader";
import { buildClosePositionDraft } from "@/lib/trading/closePositionDraft";
import type { OrderDraft, TradingAccount } from "@/lib/trading/types";
import { fieldClass } from "../../design-system/styles";
import { useValueFlash } from "@/lib/design-system/useValueFlash";
import { AccountMarginSummary } from "./AccountMarginSummary";
import { ClosePositionConfirmModal } from "./ClosePositionConfirmModal";
import { groupAccountOrders, orderGroupLabel } from "@/lib/trading/orderGroups";
import { ProtectiveOcoForm } from "../../trading/ProtectiveOcoForm";
import { usePlaybookInstances } from "../../trading/usePlaybookInstances";
import { PlaybookAutoManageSettings } from "../../trading/PlaybookAutoManageSettings";
import {
  findActivePlaybookForPosition,
  formatNextManageDistance,
  formatPlaybookManageLabel,
} from "@/lib/trading/playbook/display";
import {
  detachPlaybookInstance,
  pausePlaybookInstance,
  resumePlaybookInstance,
  skipNextPlaybookRule,
} from "@/lib/trading/tradingClient";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";

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

function resolveSnapshotUpdatedAt(
  summaryUpdatedAt: number | null | undefined,
  pnlUpdatedAt: number | null | undefined,
  positions: AccountPosition[],
): number | null {
  const timestamps = [
    summaryUpdatedAt,
    pnlUpdatedAt,
    ...positions.map((row) => row.updatedAt),
  ].filter((value): value is number => typeof value === "number");
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function connectionStatusLabel(connectionState: string): string {
  if (connectionState === "connected") return "Connected";
  if (connectionState === "connecting") return "Connecting";
  if (connectionState === "disconnected") return "Disconnected";
  if (connectionState === "error") return "Error";
  return connectionState;
}

function pnlColorClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return value > 0 ? "text-[var(--edge-positive)]" : "text-[var(--edge-negative)]";
}

const METRIC_HELP: Record<string, string> = {
  "Net liquidation":
    "Total portfolio value if all positions were liquidated at current market prices.",
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
  onClose,
  onContextMenu,
  manageLabel,
  manageDistance,
}: {
  row: AccountPosition;
  onSelect: (symbol: string) => void;
  onClose: (row: AccountPosition) => void;
  onContextMenu: (row: AccountPosition, pos: { x: number; y: number }) => void;
  manageLabel?: string | null;
  manageDistance?: string | null;
}) {
  const symbol = row.contract.symbol ?? "—";
  const qty = row.position ?? 0;
  const pnl = row.unrealizedPNL;
  const pnlFlash = useValueFlash(pnl);
  const pnlClass = pnlFlash.toneClass || pnlColorClass(pnl);
  const canClose = qty !== 0 && symbol !== "—";

  return (
    <div
      className="group grid w-full grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,0.75fr))] gap-2 border-b border-[var(--edge-border)] px-2 py-1.5 text-left text-[11px] hover:bg-[var(--edge-surface-hover)]"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(row, { x: event.clientX, y: event.clientY });
      }}
    >
      <button
        type="button"
        className="contents"
        onClick={() => onSelect(symbol)}
      >
        <div className="min-w-0">
          <span className="truncate font-medium text-[var(--edge-text-strong)]">{symbol}</span>
          {manageLabel ? (
            <>
              <div
                className="truncate text-[10px] text-[var(--edge-accent-blue)]"
                data-testid={`account-manage-${symbol}`}
              >
                {manageLabel}
              </div>
              {manageDistance ? (
                <div
                  className="truncate text-[10px] text-[var(--edge-text-secondary)]"
                  data-testid={`account-manage-distance-${symbol}`}
                >
                  {manageDistance}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <span className={qty < 0 ? "text-[var(--edge-negative)]" : ""}>{qty}</span>
        <span>{formatMoney(row.avgCost)}</span>
        <span>{formatMoney(row.marketPrice)}</span>
      </button>
      <div className="relative min-w-0 overflow-hidden">
        <button
          type="button"
          className={`block w-full truncate text-left tabular-nums transition-colors duration-[2000ms] motion-reduce:transition-none ${pnlClass}`}
          data-testid={`position-pnl-${symbol}`}
          data-flash={pnlFlash.flash}
          onClick={() => onSelect(symbol)}
        >
          {formatMoney(pnl)}
        </button>
        {canClose ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex translate-x-full items-center bg-[var(--edge-surface-hover)] pl-2 pr-0.5 opacity-0 shadow-[-10px_0_12px_rgba(0,0,0,0.35)] transition duration-150 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Close ${symbol} position`}
              data-testid={`position-close-${symbol}`}
              className="edge-focus-ring grid h-5 w-5 place-items-center rounded-[var(--edge-radius-sm)] text-[var(--edge-text-secondary)] hover:bg-[color-mix(in_srgb,var(--edge-negative)_12%,transparent)] hover:text-[var(--edge-negative)]"
              onClick={(event) => {
                event.stopPropagation();
                onClose(row);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M4.5 4.5l7 7M11.5 4.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toggleButtonClass(active: boolean): string {
  return active
    ? "rounded bg-[var(--edge-surface-active)] px-1.5 py-0.5"
    : "rounded px-1.5 py-0.5 hover:bg-[var(--edge-surface-hover)]";
}

function OrderRow({
  order,
  groupLabel,
  showCancel = false,
  cancelling = false,
  onCancel,
}: {
  order: AccountOrder;
  groupLabel?: string | null;
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
          {groupLabel ? (
            <span className="mr-1 rounded bg-[var(--edge-surface-active)] px-1 py-0.5 text-[9px] uppercase">
              {groupLabel}
            </span>
          ) : null}
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
        {order.auxPrice != null ? ` · aux ${order.auxPrice}` : ""}
        {order.parentId != null ? ` · parent ${order.parentId}` : ""}
        {order.orderRef ? ` · ref ${order.orderRef}` : ""}
      </div>
    </div>
  );
}

function resolvePanelTradingAccount(
  activeTradingAccount: TradingAccount | null | undefined,
  activeTradingAccountId: string | null | undefined,
  tradingEnvironment: TradingAccount["environment"],
): TradingAccount | null {
  if (activeTradingAccount) return activeTradingAccount;
  const accountId = activeTradingAccountId?.trim();
  if (!accountId) return null;
  return {
    broker: "ib",
    connectionId: tradingEnvironment === "live" ? "ib-live" : "ib-paper",
    accountId,
    environment: tradingEnvironment,
    availability: "online",
  };
}

export function AccountPanel() {
  const account = useAccount();
  const { aliases, setAlias } = useAccountAliases();
  const chartActions = useChartActions();
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [ordersTab, setOrdersTab] = useState<OrdersTab>("orders");
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [positionMenu, setPositionMenu] = useState<{
    row: AccountPosition;
    position: { x: number; y: number };
  } | null>(null);
  const [closeDraft, setCloseDraft] = useState<OrderDraft | null>(null);
  const [protectivePosition, setProtectivePosition] = useState<AccountPosition | null>(null);

  const panelAccount = resolvePanelTradingAccount(
    account.activeTradingAccount,
    account.activeTradingAccountId,
    account.tradingEnvironment,
  );
  const { instances: playbookInstances, refresh: refreshPlaybooks } = usePlaybookInstances(
    panelAccount?.accountId,
  );
  const header = resolveAccountPanelHeader(panelAccount, aliases);

  const tags = account.summary?.tags ?? {};
  const netLiq = parseSummaryTagNumber(tags, "NetLiquidation");
  const dayTrades = parseSummaryTagNumber(tags, "DayTradesRemaining");
  const dailyPnl = account.pnl?.dailyPnL ?? null;
  const dailyPnlFlash = useValueFlash(dailyPnl);
  const dailyPnlClass = dailyPnlFlash.toneClass || pnlColorClass(dailyPnl);
  const snapshotUpdatedAt = resolveSnapshotUpdatedAt(
    account.summary?.updatedAt,
    account.pnl?.updatedAt,
    account.positions,
  );
  const refreshTooltip =
    account.tradingEnvironment === "live"
      ? "Refresh account · updates every 15s on live"
      : "Refresh account";

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

  const openOrderGroups = useMemo(
    () => groupAccountOrders(openOrders),
    [openOrders],
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

  const handleClosePosition = (row: AccountPosition) => {
    if (!panelAccount) return;
    const draft = buildClosePositionDraft({ position: row, account: panelAccount });
    if (!draft) return;
    setCloseDraft(draft);
  };

  const resolveManageInstance = (row: AccountPosition): PlaybookInstance | null => {
    if (!panelAccount) return null;
    return findActivePlaybookForPosition(
      playbookInstances,
      row.contract.symbol ?? "",
      panelAccount.accountId,
    );
  };

  const handleDetachPlaybook = async (instance: PlaybookInstance) => {
    try {
      await detachPlaybookInstance(instance.id);
      await refreshPlaybooks();
    } catch {
      // keep prior label until next refresh
    }
  };

  const handlePausePlaybook = async (instance: PlaybookInstance) => {
    try {
      await pausePlaybookInstance(instance.id);
      await refreshPlaybooks();
    } catch {
      // keep prior label until next refresh
    }
  };

  const handleResumePlaybook = async (instance: PlaybookInstance) => {
    try {
      await resumePlaybookInstance(instance.id);
      await refreshPlaybooks();
    } catch {
      // keep prior label until next refresh
    }
  };

  const handleSkipPlaybook = async (instance: PlaybookInstance) => {
    try {
      await skipNextPlaybookRule(instance.id);
      await refreshPlaybooks();
    } catch {
      // keep prior label until next refresh
    }
  };

  const positionMenuItems: ContextMenuItem[] = (() => {
    if (!positionMenu) return [];
    const closeDraftForMenu = panelAccount
      ? buildClosePositionDraft({ position: positionMenu.row, account: panelAccount })
      : null;
    const manageInstance = resolveManageInstance(positionMenu.row);
    return [
      {
        id: "view-chart",
        label: "View on chart",
        action: () => {
          const symbol = positionMenu.row.contract.symbol?.trim();
          if (symbol) handleSelectSymbol(symbol);
        },
      },
      {
        id: "protect-oco",
        label: "Protect with OCO",
        action: () => setProtectivePosition(positionMenu.row),
      },
      ...(manageInstance
        ? [
            ...(manageInstance.status === "paused"
              ? [
                  {
                    id: "resume-playbook",
                    label: "Resume management playbook",
                    action: () => void handleResumePlaybook(manageInstance),
                  },
                ]
              : [
                  {
                    id: "pause-playbook",
                    label: "Pause management playbook",
                    action: () => void handlePausePlaybook(manageInstance),
                  },
                ]),
            {
              id: "skip-playbook",
              label: "Skip next manage rule",
              action: () => void handleSkipPlaybook(manageInstance),
            },
            {
              id: "detach-playbook",
              label: "Detach management playbook",
              action: () => void handleDetachPlaybook(manageInstance),
            },
          ]
        : []),
      {
        id: "close-position",
        label: "Close position",
        danger: true,
        disabled: !closeDraftForMenu,
        action: () => handleClosePosition(positionMenu.row),
      },
    ];
  })();

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

  const startRename = () => {
    if (!panelAccount) return;
    const key = `${panelAccount.connectionId}::${panelAccount.accountId}`;
    setRenameDraft(aliases[key] ?? "");
    setRenaming(true);
  };

  const commitRename = () => {
    if (!panelAccount) return;
    setAlias(panelAccount, renameDraft);
    setRenaming(false);
  };

  if (account.disabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-[var(--edge-text-secondary)]">
        <p>Account tracking is unavailable.</p>
        <p>Broker connection is offline. Open Data Health or Settings to reconnect.</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-[var(--edge-text-primary)]">
      <header className="border-b border-[var(--edge-border)] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {renaming && panelAccount ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  className={fieldClass({ density: "compact" })}
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRename();
                    if (event.key === "Escape") setRenaming(false);
                  }}
                  placeholder={panelAccount.accountId}
                  autoFocus
                  data-testid="account-rename-input"
                />
                <EdgeButton theme="dark" className="!px-2 !py-0.5 text-[10px]" onClick={commitRename}>
                  Save
                </EdgeButton>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="text-xs font-semibold text-[var(--edge-text-strong)]" data-testid="account-panel-title">
                  {header.title}
                </div>
                {panelAccount ? (
                  <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center rounded text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-secondary)]"
                    aria-label="Rename account"
                    data-testid="account-rename-button"
                    onClick={startRename}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            )}
            {header.subtitle ? (
              <div className="text-[10px] text-[var(--edge-text-muted)]" data-testid="account-panel-subtitle">
                {header.subtitle}
              </div>
            ) : null}
            <div className="text-[10px] text-[var(--edge-text-secondary)]" data-testid="account-panel-status">
              {connectionStatusLabel(account.connectionState)}
              {" · "}
              updated {relativeUpdatedAt(snapshotUpdatedAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PanelPopOutButton label="Pop out" />
            <Tooltip content={refreshTooltip} theme="dark" side="bottom" portaled>
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
            </Tooltip>
          </div>
        </div>
        {account.error ? (
          <p className="mt-1 text-[10px] text-[var(--edge-negative)]">{account.error}</p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className="shrink-0 grid grid-cols-2 gap-2 px-3 py-3">
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
            <div
              className={`text-[11px] tabular-nums transition-colors duration-[2000ms] motion-reduce:transition-none ${dailyPnlClass}`}
              data-testid="account-daily-pnl"
              data-flash={dailyPnlFlash.flash}
            >
              Daily PnL {formatMoney(dailyPnl)}
            </div>
          </div>

          <AccountMarginSummary tags={tags} />
        </section>

        <section className="shrink-0 border-t border-[var(--edge-border)] px-3 py-2">
          <PlaybookAutoManageSettings tradingEnvironment={account.tradingEnvironment} />
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
              {filteredPositions.map((row, index) => {
                const manageInstance = resolveManageInstance(row);
                return (
                  <PositionRow
                    key={`${row.contract.conId ?? row.contract.symbol}-${index}`}
                    row={row}
                    onSelect={handleSelectSymbol}
                    onClose={handleClosePosition}
                    onContextMenu={(positionRow, position) =>
                      setPositionMenu({ row: positionRow, position })
                    }
                    manageLabel={
                      manageInstance ? formatPlaybookManageLabel(manageInstance) : null
                    }
                    manageDistance={
                      manageInstance
                        ? formatNextManageDistance(manageInstance, row.marketPrice ?? null)
                        : null
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[var(--edge-border)]">
          <div className="mb-2 flex shrink-0 flex-wrap gap-2 px-3 pt-2 text-[10px]">
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
          <div
            data-testid="account-orders-scroll"
            className="edge-overlay-scroll min-h-0 flex-1 px-3 pb-2"
          >
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
                  {openOrderGroups.map((group) => {
                    const groupLabel = orderGroupLabel(group);
                    if (group.kind === "single") {
                      return (
                        <OrderRow
                          key={group.order.orderId ?? group.order.permId ?? `${group.order.symbol}-${group.order.updatedAt}`}
                          order={group.order}
                          showCancel
                          cancelling={cancellingOrderId === group.order.orderId}
                          onCancel={() => void handleCancelOrder(group.order)}
                        />
                      );
                    }
                    if (group.kind === "bracket") {
                      return (
                        <div
                          key={group.entry.orderId ?? group.entry.permId ?? group.entry.orderRef}
                          className="space-y-1 rounded border border-[var(--edge-border-subtle)] p-1"
                        >
                          <OrderRow
                            order={group.entry}
                            groupLabel={groupLabel}
                            showCancel
                            cancelling={cancellingOrderId === group.entry.orderId}
                            onCancel={() => void handleCancelOrder(group.entry)}
                          />
                          {group.children.map((child) => (
                            <OrderRow
                              key={child.orderId ?? child.permId ?? child.orderRef}
                              order={child}
                              groupLabel="Child"
                              showCancel
                              cancelling={cancellingOrderId === child.orderId}
                              onCancel={() => void handleCancelOrder(child)}
                            />
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={group.orders.map((order) => order.orderId).join("-")}
                        className="space-y-1 rounded border border-[var(--edge-border-subtle)] p-1"
                      >
                        {group.orders.map((order) => (
                          <OrderRow
                            key={order.orderId ?? order.permId ?? order.orderRef}
                            order={order}
                            groupLabel={groupLabel}
                            showCancel
                            cancelling={cancellingOrderId === order.orderId}
                            onCancel={() => void handleCancelOrder(order)}
                          />
                        ))}
                      </div>
                    );
                  })}
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
          </div>
        </section>
      </div>

      <ContextMenu
        open={positionMenu != null}
        position={positionMenu?.position ?? null}
        items={positionMenuItems}
        header={positionMenu?.row.contract.symbol ?? undefined}
        onClose={() => setPositionMenu(null)}
        aria-label="Position actions"
      />

      <ClosePositionConfirmModal
        open={closeDraft != null}
        draft={closeDraft}
        environment={account.tradingEnvironment}
        onClose={() => setCloseDraft(null)}
        onSuccess={() => account.refresh()}
      />

      {protectivePosition && panelAccount ? (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-[var(--edge-border)] bg-[var(--edge-surface-raised)] shadow-lg">
          <ProtectiveOcoForm
            position={protectivePosition}
            account={panelAccount}
            onClose={() => setProtectivePosition(null)}
            onSubmitted={() => void account.refresh()}
          />
        </div>
      ) : null}
    </div>
  );
}
