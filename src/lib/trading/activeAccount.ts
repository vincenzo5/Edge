import type { TradingAccount } from "./types";

export const ACTIVE_TRADING_ACCOUNT_KEY = "edge:trading:activeAccount";

export type ActiveTradingAccount = TradingAccount & {
  updatedAt: number;
};

export function readActiveTradingAccount(): ActiveTradingAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_TRADING_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTradingAccount;
    if (!parsed?.accountId?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeActiveTradingAccount(account: TradingAccount): void {
  if (typeof window === "undefined") return;
  const payload: ActiveTradingAccount = {
    ...account,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(ACTIVE_TRADING_ACCOUNT_KEY, JSON.stringify(payload));
}

export function clearActiveTradingAccount(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_TRADING_ACCOUNT_KEY);
}

export function resolveTradingAccountId(
  accounts: TradingAccount[],
  preferred?: string | null,
): string {
  const managed = accounts.map((account) => account.accountId.trim());
  const normalizedPreferred = preferred?.trim();
  if (normalizedPreferred && managed.includes(normalizedPreferred)) {
    return normalizedPreferred;
  }

  const stored = readActiveTradingAccount();
  if (stored && managed.includes(stored.accountId.trim())) {
    return stored.accountId.trim();
  }

  const envAccount = process.env.TWS_ACCOUNT_ID?.trim();
  if (envAccount && managed.includes(envAccount)) {
    return envAccount;
  }

  if (managed.length === 0) {
    throw new Error("No managed trading accounts available");
  }
  return managed[0]!;
}
