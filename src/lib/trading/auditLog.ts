import { getRequestId } from "@/lib/observability/requestIdContext";

export type TradingAuditAction =
  | "preview"
  | "submit"
  | "modify"
  | "cancel"
  | "blocked"
  | "failed";

export type TradingAuditOutcome = "success" | "blocked" | "failed";

export type TradingAuditEntry = {
  at: number;
  action: TradingAuditAction;
  outcome: TradingAuditOutcome;
  accountId?: string;
  intentId?: string;
  orderRef?: string;
  detail?: string;
  requestId?: string;
};

const MAX_ENTRIES = 500;
const entries: TradingAuditEntry[] = [];

export function appendAudit(entry: Omit<TradingAuditEntry, "at"> & { at?: number }): void {
  const requestId = getRequestId();
  const normalized: TradingAuditEntry = {
    ...entry,
    at: entry.at ?? Date.now(),
    ...(requestId && !entry.requestId ? { requestId } : {}),
  };
  entries.push(normalized);
  while (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  void import("./tradingAuditPersist")
    .then((mod) => mod.persistTradingAudit(normalized))
    .catch(() => {});
}

export function listAudit(): readonly TradingAuditEntry[] {
  return [...entries];
}

export function resetAuditLogForTests(): void {
  entries.length = 0;
}
