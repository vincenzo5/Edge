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
};

const MAX_ENTRIES = 500;
const entries: TradingAuditEntry[] = [];

export function appendAudit(entry: Omit<TradingAuditEntry, "at"> & { at?: number }): void {
  entries.push({ ...entry, at: entry.at ?? Date.now() });
  while (entries.length > MAX_ENTRIES) {
    entries.shift();
  }
}

export function listAudit(): readonly TradingAuditEntry[] {
  return [...entries];
}

export function resetAuditLogForTests(): void {
  entries.length = 0;
}
