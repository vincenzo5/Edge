import { z } from "zod";
import { tradingAccountKey } from "./accountPickerOptions";
import type { TradingAccount } from "./types";

export const ACCOUNT_ALIASES_STORAGE_KEY = "edge:trading:accountAliases.v1";

const AccountAliasesSchema = z.record(z.string(), z.string());

export type AccountAliases = Record<string, string>;

export function readAccountAliases(): AccountAliases {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACCOUNT_ALIASES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = AccountAliasesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function writeAccountAliases(aliases: AccountAliases): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_ALIASES_STORAGE_KEY, JSON.stringify(aliases));
}

export function setAccountAlias(
  aliases: AccountAliases,
  account: Pick<TradingAccount, "connectionId" | "accountId">,
  alias: string,
): AccountAliases {
  const key = tradingAccountKey(account);
  const trimmed = alias.trim();
  const next = { ...aliases };
  if (!trimmed) {
    delete next[key];
  } else {
    next[key] = trimmed;
  }
  writeAccountAliases(next);
  return next;
}

export function resolveAccountDisplayName(
  account: Pick<TradingAccount, "connectionId" | "accountId">,
  aliases?: AccountAliases | null,
): string {
  const key = tradingAccountKey(account);
  const alias = aliases?.[key]?.trim();
  if (alias) return alias;
  return account.accountId;
}
