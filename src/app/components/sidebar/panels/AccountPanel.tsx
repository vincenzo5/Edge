"use client";

import { useMemo, useState } from "react";
import { useAccount } from "../../AccountProvider";
import { useChartActions } from "../../ChartActionsContext";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import EdgeButton from "../../design-system/EdgeButton";

function formatMoney(value: number | null | undefined, currency = "USD"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function relativeUpdatedAt(ts: number | null | undefined): string {
  if (!ts) return "—";
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  if (mins < 1) return "just now";
  return `${mins}m ago`;
}

type PositionFilter = "all" | "long" | "short";
type PositionSort = "marketValue" | "unrealizedPnL";

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
  const pnlClass =
    pnl == null ? "" : pnl >= 0 ? "text-[var(--edge-accent-green)]" : "text-[var(--edge-accent-red)]";

  return (
    <button
      type="button"
      className="grid w-full grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,0.75fr))] gap-2 border-b border-[var(--edge-border)] px-2 py-1.5 text-left text-[11px] hover:bg-[var(--edge-surface-hover)]"
      onClick={() => onSelect(symbol)}
    >
      <span className="truncate font-medium text-[var(--edge-text-strong)]">{symbol}</span>
      <span className={qty < 0 ? "text-[var(--edge-accent-red)]" : ""}>{qty}</span>
      <span>{formatMoney(row.avgCost)}</span>
      <span>{formatMoney(row.marketPrice)}</span>
      <span className={pnlClass}>{formatMoney(pnl)}</span>
    </button>
  );
}

function WhatIfPreview() {
  const [symbol, setSymbol] = useState("AAPL");
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(10);
  const [orderType, setOrderType] = useState<"LMT" | "MKT">("LMT");
  const [limitPrice, setLimitPrice] = useState(150);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brokerage/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          action,
          quantity,
          orderType,
          limitPrice: orderType === "LMT" ? limitPrice : undefined,
        }),
      });
      const payload = (await res.json()) as { result?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Preview failed");
      setResult(payload.result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border-t border-[var(--edge-border)] px-3 py-3">
      <h3 className="mb-2 text-xs font-semibold text-[var(--edge-text-strong)]">
        What-if preview
      </h3>
      <p className="mb-2 text-[10px] text-[var(--edge-text-secondary)]">
        Preview only — no order is sent.
      </p>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <label className="flex flex-col gap-1">
          Symbol
          <input
            className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        </label>
        <label className="flex flex-col gap-1">
          Action
          <select
            className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1"
            value={action}
            onChange={(e) => setAction(e.target.value as "BUY" | "SELL")}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Qty
          <input
            type="number"
            min={1}
            className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          Type
          <select
            className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as "LMT" | "MKT")}
          >
            <option value="LMT">Limit</option>
            <option value="MKT">Market</option>
          </select>
        </label>
        {orderType === "LMT" ? (
          <label className="col-span-2 flex flex-col gap-1">
            Limit price
            <input
              type="number"
              min={0}
              step={0.01}
              className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1"
              value={limitPrice}
              onChange={(e) => setLimitPrice(Number(e.target.value))}
            />
          </label>
        ) : null}
      </div>
      <div className="mt-2">
        <EdgeButton variant="primary" disabled={loading} onClick={() => void preview()}>
          {loading ? "Previewing…" : "Preview order"}
        </EdgeButton>
      </div>
      {error ? <p className="mt-2 text-[11px] text-[var(--edge-accent-red)]">{error}</p> : null}
      {result ? (
        <div className="mt-2 space-y-1 text-[11px] text-[var(--edge-text-primary)]">
          <div>Init margin Δ: {formatMoney(result.initMarginChange as number | null)}</div>
          <div>Maint margin Δ: {formatMoney(result.maintMarginChange as number | null)}</div>
          <div>Commission: {formatMoney(result.commission as number | null)}</div>
          {typeof result.warningText === "string" && result.warningText ? (
            <div className="text-[var(--edge-text-secondary)]">{result.warningText}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function AccountPanel() {
  const account = useAccount();
  const chartActions = useChartActions();
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [positionSort, setPositionSort] = useState<PositionSort>("marketValue");

  const tags = account.summary?.tags ?? {};
  const netLiq = parseSummaryTagNumber(tags, "NetLiquidation");
  const buyingPower = parseSummaryTagNumber(tags, "BuyingPower");
  const availableFunds = parseSummaryTagNumber(tags, "AvailableFunds");
  const excessLiquidity = parseSummaryTagNumber(tags, "ExcessLiquidity");
  const initMargin = parseSummaryTagNumber(tags, "InitMarginReq");
  const maintMargin = parseSummaryTagNumber(tags, "MaintMarginReq");
  const leverage = parseSummaryTagNumber(tags, "Leverage");
  const dayTrades = parseSummaryTagNumber(tags, "DayTradesRemaining");
  const dailyPnl = account.pnl?.dailyPnL ?? null;

  const filteredPositions = useMemo(() => {
    let rows = [...account.positions];
    if (positionFilter === "long") rows = rows.filter((r) => (r.position ?? 0) > 0);
    if (positionFilter === "short") rows = rows.filter((r) => (r.position ?? 0) < 0);
    rows.sort((a, b) => {
      const av =
        positionSort === "marketValue"
          ? Math.abs(a.marketValue ?? 0)
          : Math.abs(a.unrealizedPNL ?? 0);
      const bv =
        positionSort === "marketValue"
          ? Math.abs(b.marketValue ?? 0)
          : Math.abs(b.unrealizedPNL ?? 0);
      return bv - av;
    });
    return rows;
  }, [account.positions, positionFilter, positionSort]);

  const handleSelectSymbol = (symbol: string) => {
    chartActions?.loadSymbolIntoActiveChart({
      symbol,
      name: symbol,
      exchange: "",
    });
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
              {account.status?.accountId ?? "Account"}
            </div>
            <div className="text-[10px] text-[var(--edge-text-secondary)]">
              {account.connectionState === "connected" ? "Connected" : account.connectionState}
              {" · "}
              updated {relativeUpdatedAt(account.summary?.updatedAt)}
            </div>
          </div>
          <button
            type="button"
            className="text-[10px] text-[var(--edge-accent-blue)] hover:underline"
            onClick={() => void account.refresh()}
          >
            Refresh
          </button>
        </div>
        {account.error ? (
          <p className="mt-1 text-[10px] text-[var(--edge-accent-red)]">{account.error}</p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="grid grid-cols-2 gap-2 px-3 py-3">
          <div className="col-span-2 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-2">
            <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
              Net liquidation
            </div>
            <div className="text-lg font-semibold">{formatMoney(netLiq)}</div>
            <div
              className={
                dailyPnl != null && dailyPnl >= 0
                  ? "text-[11px] text-[var(--edge-accent-green)]"
                  : "text-[11px] text-[var(--edge-accent-red)]"
              }
            >
              Daily PnL {formatMoney(dailyPnl)}
            </div>
          </div>
          <MetricTile label="Buying power" value={formatMoney(buyingPower)} />
          <MetricTile label="Available funds" value={formatMoney(availableFunds)} />
          <MetricTile label="Excess liquidity" value={formatMoney(excessLiquidity)} />
          <MetricTile label="Init margin" value={formatMoney(initMargin)} />
          <MetricTile label="Maint margin" value={formatMoney(maintMargin)} />
          <MetricTile label="Leverage" value={leverage?.toFixed(2) ?? "—"} />
          <MetricTile label="Day trades left" value={dayTrades?.toString() ?? "—"} />
        </section>

        <section className="border-t border-[var(--edge-border)] px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[var(--edge-text-strong)]">Positions</h3>
            <div className="flex gap-1 text-[10px]">
              {(["all", "long", "short"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={
                    positionFilter === filter
                      ? "rounded bg-[var(--edge-surface-active)] px-1.5 py-0.5"
                      : "rounded px-1.5 py-0.5 hover:bg-[var(--edge-surface-hover)]"
                  }
                  onClick={() => setPositionFilter(filter)}
                >
                  {filter}
                </button>
              ))}
              <select
                className="rounded border border-[var(--edge-border)] bg-transparent px-1"
                value={positionSort}
                onChange={(e) => setPositionSort(e.target.value as PositionSort)}
              >
                <option value="marketValue">Mkt value</option>
                <option value="unrealizedPnL">Unrealized PnL</option>
              </select>
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
          <h3 className="mb-2 text-xs font-semibold text-[var(--edge-text-strong)]">
            Open orders
          </h3>
          {account.orders.length === 0 ? (
            <p className="text-[11px] text-[var(--edge-text-secondary)]">No open orders.</p>
          ) : (
            <div className="space-y-1 text-[11px]">
              {account.orders.map((order) => (
                <div
                  key={order.orderId ?? order.permId ?? `${order.symbol}-${order.updatedAt}`}
                  className="rounded border border-[var(--edge-border)] px-2 py-1"
                >
                  <div className="font-medium">
                    {order.symbol} · {order.action} {order.totalQuantity} · {order.orderType}
                  </div>
                  <div className="text-[var(--edge-text-secondary)]">
                    {order.status} · filled {order.filled ?? 0}/{order.totalQuantity ?? 0}
                    {order.lmtPrice != null ? ` · lmt ${order.lmtPrice}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-[var(--edge-border)] px-3 py-2">
          <h3 className="mb-2 text-xs font-semibold text-[var(--edge-text-strong)]">
            Today&apos;s fills
          </h3>
          {account.executions.length === 0 ? (
            <p className="text-[11px] text-[var(--edge-text-secondary)]">No fills yet.</p>
          ) : (
            <div className="space-y-1 text-[11px]">
              {account.executions.slice(0, 20).map((fill) => (
                <div
                  key={fill.execId ?? `${fill.symbol}-${fill.time}-${fill.price}`}
                  className="rounded border border-[var(--edge-border)] px-2 py-1"
                >
                  <div className="font-medium">
                    {fill.symbol} · {fill.side} {fill.shares} @ {fill.price}
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

        <WhatIfPreview />
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-2">
      <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">{label}</div>
      <div className="text-xs font-medium">{value}</div>
    </div>
  );
}
