"use client";

import { useEffect, useMemo, useState } from "react";
import { headerBarClass } from "../design-system/styles";
import { useAccount } from "../AccountProvider";
import { fetchJournalFills } from "@/lib/persistence/client/journalClient";
import { fetchTradingAccounts, TradingApiError } from "@/lib/trading/tradingClient";
import {
  accountPickerLabel,
  buildAccountPickerOptions,
  distinctJournalAccountIds,
  findAccountByKey,
  resolveActiveAccountMatch,
  tradingAccountKey,
} from "@/lib/trading/accountPickerOptions";
import type { TradingAccount } from "@/lib/trading/types";

export default function AppTopHeader() {
  const account = useAccount();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [tradingResult, fills] = await Promise.all([
          fetchTradingAccounts(),
          fetchJournalFills().catch(() => []),
        ]);
        if (cancelled) return;
        const journalAccountIds = distinctJournalAccountIds(fills);
        setAccounts(
          buildAccountPickerOptions(tradingResult.accounts, journalAccountIds),
        );
        setDefaultAccountId(tradingResult.defaultAccountId);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof TradingApiError
            ? err.message
            : "Could not load trading accounts.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (accounts.length === 0) return;
    const activeMatch = resolveActiveAccountMatch(
      accounts,
      account.activeTradingAccount,
      account.activeTradingAccountId,
    );
    if (activeMatch) return;

    const defaultAccount =
      accounts.find((row) => row.accountId === defaultAccountId) ?? accounts[0];
    if (defaultAccount) {
      account.setActiveTradingAccount(defaultAccount);
    }
  }, [
    accounts,
    defaultAccountId,
    account.activeTradingAccount,
    account.activeTradingAccountId,
    account.setActiveTradingAccount,
  ]);

  const selectedAccount = useMemo(
    () =>
      resolveActiveAccountMatch(
        accounts,
        account.activeTradingAccount,
        account.activeTradingAccountId,
      ),
    [accounts, account.activeTradingAccount, account.activeTradingAccountId],
  );

  return (
    <header
      data-testid="app-top-header"
      className={`${headerBarClass("dark")} justify-between px-3`}
    >
      <div className="text-sm font-semibold tracking-tight text-[var(--edge-text-strong)]">
        edge
      </div>
      <div className="flex items-center gap-2">
        {error ? (
          <span className="text-[10px] text-[var(--edge-negative)]" role="alert">
            {error}
          </span>
        ) : null}
        <label className="sr-only" htmlFor="app-account-picker">
          Account
        </label>
        <select
          id="app-account-picker"
          data-testid="app-account-picker"
          className="rounded border border-[var(--edge-border)] bg-transparent px-2 py-1 text-xs"
          value={selectedAccount ? tradingAccountKey(selectedAccount) : ""}
          disabled={loading || accounts.length === 0}
          onChange={(event) => {
            const next = findAccountByKey(accounts, event.target.value);
            if (next) account.setActiveTradingAccount(next);
          }}
        >
          {accounts.length === 0 ? (
            <option value="">{loading ? "Loading accounts…" : "No accounts"}</option>
          ) : (
            accounts.map((row) => (
              <option key={tradingAccountKey(row)} value={tradingAccountKey(row)}>
                {accountPickerLabel(row)}
              </option>
            ))
          )}
        </select>
      </div>
    </header>
  );
}
