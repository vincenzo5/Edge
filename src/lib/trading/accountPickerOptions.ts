import { resolveAccountDisplayName, type AccountAliases } from "./accountAliases";
import type { TradingAccount } from "./types";

/** Legacy persisted connection id — remapped to gateway/offline live on load. */
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

export function isOnlineTradingAccount(account: TradingAccount | null | undefined): boolean {
  return account?.availability !== "offline";
}

export function isGatewayTradingAccount(account: TradingAccount | null | undefined): boolean {
  return Boolean(
    account &&
      account.connectionId !== JOURNAL_CONNECTION_ID &&
      isOnlineTradingAccount(account),
  );
}

export function accountPickerLabel(
  account: TradingAccount,
  aliases?: AccountAliases | null,
): string {
  const displayName = resolveAccountDisplayName(account, aliases);
  if (account.availability === "offline") {
    return `${displayName} (live, offline)`;
  }
  const envLabel = account.environment === "live" ? "live" : "paper";
  return `${displayName} (${envLabel})`;
}

export function buildAccountPickerOptions(gatewayAccounts: TradingAccount[]): TradingAccount[] {
  return [...gatewayAccounts];
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
    if (stored.connectionId === JOURNAL_CONNECTION_ID) {
      const normalizedId = stored.accountId.trim();
      const remapped =
        accounts.find((row) => row.accountId === normalizedId) ?? null;
      if (remapped) return remapped;
    }
    const match = accounts.find((row) => accountsMatch(row, stored));
    if (match) return match;
  }

  const normalizedId = activeAccountIdOnly?.trim();
  if (normalizedId) {
    return accounts.find((row) => row.accountId === normalizedId) ?? null;
  }

  return null;
}
