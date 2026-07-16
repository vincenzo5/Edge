"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readAccountAliases,
  resolveAccountDisplayName,
  setAccountAlias,
  type AccountAliases,
} from "@/lib/trading/accountAliases";
import type { TradingAccount } from "@/lib/trading/types";

type AccountAliasesContextValue = {
  aliases: AccountAliases;
  setAlias: (account: TradingAccount, alias: string) => void;
  displayNameFor: (account: TradingAccount | null | undefined) => string;
};

const AccountAliasesContext = createContext<AccountAliasesContextValue | null>(null);

export function AccountAliasesProvider({ children }: { children: ReactNode }) {
  const [aliases, setAliases] = useState<AccountAliases>({});

  useEffect(() => {
    setAliases(readAccountAliases());
  }, []);

  const setAlias = useCallback((account: TradingAccount, alias: string) => {
    setAliases((prev) => setAccountAlias(prev, account, alias));
  }, []);

  const displayNameFor = useCallback(
    (account: TradingAccount | null | undefined) => {
      if (!account) return "";
      return resolveAccountDisplayName(account, aliases);
    },
    [aliases],
  );

  const value = useMemo(
    () => ({ aliases, setAlias, displayNameFor }),
    [aliases, setAlias, displayNameFor],
  );

  return (
    <AccountAliasesContext.Provider value={value}>{children}</AccountAliasesContext.Provider>
  );
}

export function useAccountAliases(): AccountAliasesContextValue {
  const ctx = useContext(AccountAliasesContext);
  if (!ctx) {
    throw new Error("useAccountAliases must be used within AccountAliasesProvider");
  }
  return ctx;
}

export function useAccountAliasesOptional(): AccountAliasesContextValue | null {
  return useContext(AccountAliasesContext);
}
