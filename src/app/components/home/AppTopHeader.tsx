"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { recordLastModule } from "@/lib/app/lastModule";
import { headerBarClass } from "../design-system/styles";
import EdgeIconButton from "../design-system/EdgeIconButton";
import { useAccount } from "../AccountProvider";
import { useAccountAliases } from "../AccountAliasesProvider";
import { fetchTradingAccounts } from "@/lib/trading/tradingClient";
import { fetchTwsCircuitOpen } from "@/lib/marketData/fetchTwsCircuitOpen";
import {
  resolveActiveAccountMatch,
} from "@/lib/trading/accountPickerOptions";
import { isDemoJournalUserEmail } from "@/lib/trading/demoJournalAccount";
import type { TradingAccount } from "@/lib/trading/types";
import { subscribeTwsRecovery } from "@/lib/marketData/twsRecoveryBus";
import AccountPickerMenu from "./AccountPickerMenu";
import AppSettingsShell from "./AppSettingsShell";
import NotificationBellMenu from "../notifications/NotificationBellMenu";
import OpenRiskPositionsMenu from "./OpenRiskPositionsMenu";
import { useAppChromeActions } from "./AppChromeActionsProvider";
import { useAppTheme } from "../AppThemeProvider";
import { MoonIcon, SettingsIcon, SunIcon } from "../chart-chrome/ChartHeaderIcons";
import { runTwsRecoveryClient } from "@/lib/marketData/twsRecoveryClient";
import DensitySwitcher from "../research/DensitySwitcher";
import TwsRecoverButton from "../data-health/TwsRecoverButton";
import { annotationTextClass } from "../design-system/styles";
import { useShellBrokerConnectionChrome } from "./useShellBrokerConnectionChrome";

type Props = {
  centerSlot?: React.ReactNode;
};

export default function AppTopHeader({ centerSlot }: Props) {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const account = useAccount();
  const { aliases, setAlias } = useAccountAliases();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveringTws, setRecoveringTws] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);
  const {
    settingsOpen,
    openAppSettings,
    closeAppSettings,
    settingsTriggerRef,
    orderAccountMenuOpen,
    openOrderAccountMenu,
    closeOrderAccountMenu,
    positionsMenuOpen,
    openPositionsMenu,
    closePositionsMenu,
    notificationsMenuOpen,
    openNotificationsMenu,
    closeNotificationsMenu,
  } = useAppChromeActions();
  const brokerChrome = useShellBrokerConnectionChrome();

  const loadAccounts = useCallback(async (options?: { force?: boolean }) => {
    if (!options?.force) {
      const circuitOpen = await fetchTwsCircuitOpen();
      if (circuitOpen) {
        setAccounts([]);
        setDefaultAccountId(null);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const tradingResult = await fetchTradingAccounts();
      const lock = tradingResult.environmentLock ?? null;
      setAccounts(
        lock
          ? tradingResult.accounts.filter((row) => row.environment === lock)
          : tradingResult.accounts,
      );
      setDefaultAccountId(tradingResult.defaultAccountId);
    } catch {
      setAccounts([]);
      setDefaultAccountId(null);
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

  // Retry while empty: circuit-open at mount clears accounts, and positions can
  // recover via AccountProvider polling without a recovery bus event.
  useEffect(() => {
    if (loading || accounts.length > 0) return;
    const timer = window.setInterval(() => {
      void loadAccounts();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [accounts.length, loading, loadAccounts]);

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
        void loadAccounts({ force: true });
      } else if (event.phase === "failed") {
        setRecoveringTws(false);
        if (event.message) setRecoverMessage(event.message);
      }
    });
  }, [loadAccounts]);

  const recoverTwsFromSettings = useCallback(async () => {
    await runTwsRecoveryClient({ source: "settings", symbols: [], candleRequests: [] });
  }, []);

  const recoverTwsFromHeader = useCallback(async () => {
    await runTwsRecoveryClient({ source: "data-health", symbols: [], candleRequests: [] });
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

  useEffect(() => {
    if (accounts.length === 0 || !defaultAccountId) return;

    let cancelled = false;
    void fetch("/api/auth/dev-session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { user?: { email?: string } | null } | null) => {
        if (cancelled || !body?.user?.email) return;
        if (!isDemoJournalUserEmail(body.user.email)) return;
        if (account.activeTradingAccountId === defaultAccountId) return;

        const demoAccount = accounts.find((row) => row.accountId === defaultAccountId);
        if (demoAccount) {
          account.setActiveTradingAccount(demoAccount);
        }
      })
      .catch(() => {
        /* ignore session probe errors */
      });

    return () => {
      cancelled = true;
    };
  }, [
    accounts,
    defaultAccountId,
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

  const themeToggleLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <>
      <header
        data-testid="app-top-header"
        data-app-context-menu-surface="true"
        className={`${headerBarClass(theme)} relative z-30 !h-auto !min-h-0 justify-between px-3 py-1`}
      >
        <div className="flex min-w-0 items-center gap-3 self-center">
          <Link
            href="/home"
            prefetch
            data-testid="app-logo-home"
            aria-label="Edge home"
            onClick={handleLogoClick}
            onMouseEnter={() => router.prefetch("/home")}
            className="edge-focus-ring flex shrink-0 items-center"
          >
            <img
              src="/brand/logo-full-light.svg"
              alt="Edge"
              className="block h-11 w-auto"
            />
          </Link>
          <DensitySwitcher />
        </div>
        {centerSlot ? (
          <div
            className="flex min-w-0 flex-1 items-center justify-center px-4"
            data-testid="app-header-primary-cluster"
          >
            {centerSlot}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div
          className="relative flex min-w-0 items-center gap-2"
          data-testid="app-header-secondary-cluster"
        >
          {brokerChrome.chromeIncidentLabel ? (
            <div className="flex items-center gap-2" role="status" data-testid="app-header-connection-slot">
              <span
                className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}
                data-testid="app-header-connection-incident"
              >
                {brokerChrome.chromeIncidentLabel}
              </span>
              {brokerChrome.showRecovery && brokerChrome.chromeRecoveryLabel ? (
                <TwsRecoverButton
                  compact
                  testId="app-header-recover-tws"
                  label={brokerChrome.chromeRecoveryLabel}
                  recovering={recoveringTws}
                  onClick={() => {
                    void recoverTwsFromHeader();
                  }}
                />
              ) : null}
              {recoverMessage ? (
                <span
                  className={`max-w-[12rem] ${annotationTextClass()}`}
                  data-testid="app-header-recover-message"
                >
                  {recoverMessage}
                </span>
              ) : null}
            </div>
          ) : null}
          <label className="sr-only" htmlFor="app-account-picker">
            Trading account
          </label>
          <AccountPickerMenu
            accounts={accounts}
            aliases={aliases}
            selectedAccount={selectedAccount}
            loading={loading}
            onSelectAccount={account.setActiveTradingAccount}
            onSetAlias={setAlias}
            open={orderAccountMenuOpen}
            onOpenChange={(next) => {
              if (next) {
                closePositionsMenu();
                closeNotificationsMenu();
                openOrderAccountMenu();
              } else {
                closeOrderAccountMenu();
              }
            }}
          />
          <OpenRiskPositionsMenu
            open={positionsMenuOpen}
            onOpenChange={(next) => {
              if (next) {
                closeOrderAccountMenu();
                closeNotificationsMenu();
                openPositionsMenu();
              } else {
                closePositionsMenu();
              }
            }}
          />
          <NotificationBellMenu
            open={notificationsMenuOpen}
            onOpenChange={(next) => {
              if (next) {
                closeOrderAccountMenu();
                closePositionsMenu();
                openNotificationsMenu();
              } else {
                closeNotificationsMenu();
              }
            }}
          />
          <EdgeIconButton
            theme={theme}
            data-testid="app-header-theme-toggle"
            aria-label={themeToggleLabel}
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <SunIcon size={16} />
            ) : (
              <MoonIcon size={16} />
            )}
          </EdgeIconButton>
          <EdgeIconButton
            ref={settingsTriggerRef}
            theme={theme}
            data-testid="app-header-settings"
            aria-label="Application settings"
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            onClick={() => openAppSettings()}
          >
            <SettingsIcon size={16} />
          </EdgeIconButton>
        </div>
      </header>
      <AppSettingsShell
        open={settingsOpen}
        onClose={() => closeAppSettings()}
        returnFocusRef={settingsTriggerRef}
        accounts={accounts}
        accountsLoading={loading}
        recoveringTws={recoveringTws}
        recoverMessage={recoverMessage}
        onRecoverTws={() => {
          void recoverTwsFromSettings();
        }}
      />
    </>
  );
}
