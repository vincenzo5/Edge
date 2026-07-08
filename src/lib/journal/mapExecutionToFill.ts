import type { AccountExecution } from "@/lib/marketData/contracts/brokerage";
import type { JournalFill, JournalFillSource } from "@/lib/journal/types";

function parseFillTime(raw: string | null | undefined): string {
  if (!raw?.trim()) return new Date().toISOString();
  const trimmed = raw.trim();
  if (/^\d{8};\d{6}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const mo = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    const h = trimmed.slice(9, 11);
    const mi = trimmed.slice(11, 13);
    const s = trimmed.slice(13, 15);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString();
  }
  const parsed = Date.parse(trimmed);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

export function mapExecutionToJournalFill(
  execution: AccountExecution,
  source: JournalFillSource = "live",
): JournalFill | null {
  const execId = execution.execId?.trim();
  if (!execId) return null;
  const quantity = execution.shares;
  const price = execution.price;
  if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) return null;
  if (price == null || !Number.isFinite(price)) return null;

  const contract = execution.contract ?? {
    symbol: execution.symbol,
    secType: execution.secType,
  };

  return {
    execId,
    account: execution.account ?? null,
    fillTime: parseFillTime(execution.time),
    side: execution.side ?? "BOT",
    quantity,
    price,
    avgPrice: execution.avgPrice ?? null,
    orderId: execution.orderId ?? null,
    permId: execution.permId ?? null,
    orderRef: execution.orderRef ?? null,
    exchange: execution.exchange ?? null,
    contract,
    commission: execution.commission ?? null,
    commissionCurrency: execution.commissionCurrency ?? null,
    realizedPNL: execution.realizedPNL ?? null,
    source,
  };
}

export function mergeJournalFills(existing: JournalFill[], incoming: JournalFill[]): JournalFill[] {
  const byExecId = new Map<string, JournalFill>();
  for (const fill of existing) byExecId.set(fill.execId, fill);
  for (const fill of incoming) {
    const prev = byExecId.get(fill.execId);
    byExecId.set(fill.execId, prev ? { ...prev, ...fill } : fill);
  }
  return [...byExecId.values()].sort(
    (a, b) => Date.parse(a.fillTime) - Date.parse(b.fillTime),
  );
}
