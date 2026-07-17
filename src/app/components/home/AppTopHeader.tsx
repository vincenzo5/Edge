"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { recordLastModule } from "@/lib/app/lastModule";
import { headerBarClass } from "../design-system/styles";
import { useAccount } from "../AccountProvider";
import { useAccountAliases } from "../AccountAliasesProvider";
import TwsRecoverButton from "../data-health/TwsRecoverButton";
import { fetchTradingAccounts, TradingApiError } from "@/lib/trading/tradingClient";
import {
  resolveActiveAccountMatch,
} from "@/lib/trading/accountPickerOptions";
import type { TradingAccount } from "@/lib/trading/types";
import { subscribeTwsRecovery } from "@/lib/marketData/twsRecoveryBus";
import { runTwsRecoveryClient } from "@/lib/marketData/twsRecoveryClient";
import {
  applyDefaultDataConnectionPreferenceIfNeeded,
  dataConnectionLabel,
} from "@/lib/marketData/dataConnectionPreference";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";
import {
  IB_LIVE_CONNECTION_ID,
  IB_PAPER_CONNECTION_ID,
} from "@/lib/trading/connectionRegistry";
import AccountPickerMenu from "./AccountPickerMenu";

type Props = {
  centerSlot?: React.ReactNode;
};

export default function AppTopHeader({ centerSlot }: Props) {
  const router = useRouter();
  const account = useAccount();
  const { aliases, setAlias } = useAccountAliases();
  const { preference, setPreference } = useDataConnectionPreference();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveringTws, setRecoveringTws] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const tradingResult = await fetchTradingAccounts();
      setAccounts(tradingResult.accounts);
      setDefaultAccountId(tradingResult.defaultAccountId);
      setError(null);
    } catch (err) {
      setError(
        err instanceof TradingApiError
          ? err.message
          : "Could not load trading accounts.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    router.prefetch("/home");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadAccounts();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAccounts]);

  useEffect(() => {
    return subscribeTwsRecovery((event) => {
      if (event.phase === "started") {
        setRecoveringTws(true);
        setRecoverMessage(null);
      } else if (event.phase === "progress" && event.message) {
        setRecoverMessage(event.message);
      } else if (event.phase === "completed") {
        setRecoveringTws(false);
        setRecoverMessage(event.message ?? null);
        void loadAccounts();
      } else if (event.phase === "failed") {
        setRecoveringTws(false);
        if (event.message) setRecoverMessage(event.message);
      }
    });
  }, [loadAccounts]);

  const recoverTwsAndReloadAccounts = useCallback(async () => {
    await runTwsRecoveryClient({ source: "app-header", symbols: [], candleRequests: [] });
  }, []);

  const liveGatewayOnline = useMemo(
    () =>
      accounts.some(
        (row) =>
          row.connectionId === IB_LIVE_CONNECTION_ID && row.availability === "online",
      ),
    [accounts],
  );

  useEffect(() => {
    if (accounts.length === 0) return;
    applyDefaultDataConnectionPreferenceIfNeeded({ liveConnected: liveGatewayOnline });
  }, [accounts, liveGatewayOnline]);

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

  const handleLogoClick = () => {
    recordLastModule("home");
  };

  return (
    <header
      data-testid="app-top-header"
      className={`${headerBarClass("dark")} !h-[45px] !min-h-[45px] overflow-hidden justify-between px-3`}
    >
      <Link
        href="/home"
        prefetch
        data-testid="app-logo-home"
        aria-label="Edge home"
        onClick={handleLogoClick}
        onMouseEnter={() => router.prefetch("/home")}
        className="edge-focus-ring flex h-full max-h-full shrink-0 items-center"
      >
        <img
          src="/brand/logo-full-light.svg"
          alt="Edge"
          className="block h-[42px] w-auto max-h-full"
        />
      </Link>
      {centerSlot ? (
        <div className="flex min-w-0 flex-1 items-center justify-center px-4">{centerSlot}</div>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex items-center gap-2">
        {error ? (
          <div className="flex items-center gap-2" role="alert">
            <span className="text-[10px] text-[var(--edge-negative)]">{error}</span>
            <TwsRecoverButton
              compact
              testId="app-header-recover-tws"
              label="Reconnect TWS"
              recovering={recoveringTws}
              onClick={() => {
                void recoverTwsAndReloadAccounts();
              }}
            />
            {recoverMessage ? (
              <span
                className="max-w-[12rem] text-[10px] text-[var(--edge-text-secondary)]"
                data-testid="app-header-recover-message"
              >
                {recoverMessage}
              </span>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          data-testid="app-data-connection-chip"
          className="rounded border border-[var(--edge-border)] px-2 py-1 text-[10px] text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-primary)]"
          aria-label="Chart data connection"
          onClick={() =>
            setPreference(
              preference === IB_LIVE_CONNECTION_ID
                ? IB_PAPER_CONNECTION_ID
                : IB_LIVE_CONNECTION_ID,
            )
          }
        >
          {dataConnectionLabel(preference)}
        </button>
        <label className="sr-only" htmlFor="app-account-picker">
          Account
        </label>
        <AccountPickerMenu
          accounts={accounts}
          aliases={aliases}
          selectedAccount={selectedAccount}
          loading={loading}
          onSelectAccount={account.setActiveTradingAccount}
          onSetAlias={setAlias}
        />
      </div>
    </header>
  );
}
