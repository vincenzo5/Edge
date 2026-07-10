import type { TradingAccount } from "./types";

export const JOURNAL_CONNECTION_ID = "journal";

export function tradingAccountKey(
  account: Pick<TradingAccount, "connectionId" | "accountId">,
): string {
  return `${account.connectionId}::${account.accountId}`;
}

export function accountsMatch(
  a: Pick<TradingAccount, "connectionId" | "accountId">,
  b: Pick<TradingAccount, "connectionId" | "accountId">,
): boolean {
  return a.connectionId === b.connectionId && a.accountId === b.accountId;
}

export function isGatewayTradingAccount(account: TradingAccount | null | undefined): boolean {
  return Boolean(account && account.connectionId !== JOURNAL_CONNECTION_ID);
}

export function accountPickerLabel(account: TradingAccount): string {
  if (account.connectionId === JOURNAL_CONNECTION_ID) {
    return `${account.accountId} (journal)`;
  }
  const envLabel = account.environment === "live" ? "live" : "paper";
  return `${account.accountId} (${envLabel})`;
}

export function buildJournalOnlyAccount(accountId: string): TradingAccount {
  return {
    broker: "ib",
    connectionId: JOURNAL_CONNECTION_ID,
    accountId: accountId.trim(),
    environment: "paper",
  };
}

export function distinctJournalAccountIds(
  fills: Array<{ account?: string | null }>,
): string[] {
  const ids = new Set<string>();
  for (const fill of fills) {
    const accountId = fill.account?.trim();
    if (accountId) ids.add(accountId);
  }
  return [...ids].sort();
}

export function buildAccountPickerOptions(
  gatewayAccounts: TradingAccount[],
  journalAccountIds: string[],
): TradingAccount[] {
  const gatewayIds = new Set(gatewayAccounts.map((row) => row.accountId.trim()));
  const seenJournal = new Set<string>();
  const journalOnly: TradingAccount[] = [];

  for (const accountId of journalAccountIds) {
    const normalized = accountId.trim();
    if (!normalized || gatewayIds.has(normalized) || seenJournal.has(normalized)) {
      continue;
    }
    seenJournal.add(normalized);
    journalOnly.push(buildJournalOnlyAccount(normalized));
  }

  return [...gatewayAccounts, ...journalOnly];
}

export function findAccountByKey(
  accounts: TradingAccount[],
  key: string,
): TradingAccount | undefined {
  return accounts.find((row) => tradingAccountKey(row) === key);
}

export function resolveActiveAccountMatch(
  accounts: TradingAccount[],
  stored: TradingAccount | null | undefined,
  activeAccountIdOnly: string | null | undefined,
): TradingAccount | null {
  if (stored) {
    const match = accounts.find((row) => accountsMatch(row, stored));
    if (match) return match;
  }

  const normalizedId = activeAccountIdOnly?.trim();
  if (normalizedId) {
    return accounts.find((row) => row.accountId === normalizedId) ?? null;
  }

  return null;
}
