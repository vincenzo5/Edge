import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { computePositionNotional } from "@/lib/journal/rMultiple";

export type TradeOutcomeStatus = "open" | "win" | "loss" | "breakeven";

export function deriveTradeOutcomeStatus(trade: JournalTradeResponse): TradeOutcomeStatus {
  if (trade.status === "open") return "open";
  const pnl = trade.netPnL;
  if (pnl == null || pnl === 0) return "breakeven";
  return pnl > 0 ? "win" : "loss";
}

export function tradeOutcomeLabel(status: TradeOutcomeStatus): string {
  switch (status) {
    case "open":
      return "OPEN";
    case "win":
      return "WIN";
    case "loss":
      return "LOSS";
    case "breakeven":
      return "BE";
  }
}

export function formatTradePrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const TRADE_LIST_TIME_ZONE = "America/New_York";

export function formatTradeListDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: TRADE_LIST_TIME_ZONE,
  }).format(date);
}

export function formatTradeMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pnlToneClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return value > 0 ? "text-[var(--edge-positive)]" : "text-[var(--edge-negative)]";
}

const DAY_SUMMARY_TIME_ZONE = "America/New_York";

export function formatDaySummaryDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: DAY_SUMMARY_TIME_ZONE,
  }).format(date);
}

export function formatTradeCloseTime(iso: string, timeZone = DAY_SUMMARY_TIME_ZONE): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDirectionLabel(direction: "long" | "short"): string {
  return direction === "short" ? "SHORT" : "LONG";
}

export function formatNetRoi(trade: JournalTradeResponse): string {
  const netPnL = trade.netPnL ?? trade.grossPnL;
  if (netPnL == null || !Number.isFinite(netPnL)) return "—";
  const notional = computePositionNotional(trade);
  if (notional == null || notional <= 0) return "—";
  const roi = (netPnL / notional) * 100;
  const formatted = `${Math.abs(roi).toFixed(2)}%`;
  return roi < 0 ? `(${formatted})` : formatted;
}

export function formatInstrumentLabel(trade: JournalTradeResponse): string {
  if ((trade.legs?.length ?? 0) > 1) {
    return trade.secType;
  }
  return trade.symbol;
}
