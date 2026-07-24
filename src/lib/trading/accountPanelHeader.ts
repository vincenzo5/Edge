import { resolveAccountDisplayName, type AccountAliases } from "./accountAliases";
import type { TradingAccount, TradingEnvironment } from "./types";

export function formatTradingEnvironmentLabel(environment: TradingEnvironment): string {
  return environment === "live" ? "Live" : "Paper";
}

export function accountEnvironmentSubtitle(account: Pick<TradingAccount, "environment" | "availability">): string {
  if (account.availability === "offline") return "Live, offline";
  return formatTradingEnvironmentLabel(account.environment);
}

export type AccountPanelHeader = {
  title: string;
  subtitle: string | null;
  hasAlias: boolean;
};

/** Panel header: title = alias or Live/Paper; subtitle = account id (+ env when aliased). */
export function resolveAccountPanelHeader(
  account: Pick<TradingAccount, "connectionId" | "accountId" | "environment" | "availability"> | null | undefined,
  aliases?: AccountAliases | null,
): AccountPanelHeader {
  if (!account) {
    return { title: "Account", subtitle: null, hasAlias: false };
  }

  const displayName = resolveAccountDisplayName(account, aliases);
  const hasAlias = displayName !== account.accountId;
  const envSubtitle = accountEnvironmentSubtitle(account);
  const title = hasAlias ? displayName : envSubtitle;

  return {
    title,
    subtitle: hasAlias ? `${account.accountId} · ${envSubtitle}` : account.accountId,
    hasAlias,
  };
}
