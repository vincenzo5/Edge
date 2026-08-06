import {
  DEMO_JOURNAL_USER_EMAIL,
  resolveDemoJournalAccountId,
} from "@/lib/journal/demoSeed/demoSeedConstants";
import { resolveTradingAccountId } from "@/lib/trading/activeAccount";
import { IB_PAPER_CONNECTION_ID } from "@/lib/trading/connectionRegistry";
import { TradingValidationError } from "@/lib/trading/validateOrder";
import type { TradingAccount } from "@/lib/trading/types";

/** True when EDGE_DEMO_JOURNAL_ACCOUNT_ID is set (enables offline Demo picker row). */
export function isDemoJournalAccountEnabled(): boolean {
  return Boolean(process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID?.trim());
}

export function resolveDemoJournalAccountIdForPicker(): string | null {
  if (!isDemoJournalAccountEnabled()) return null;
  return resolveDemoJournalAccountId();
}

export function resolveDemoJournalTradingAccount(): TradingAccount | null {
  const accountId = resolveDemoJournalAccountIdForPicker();
  if (!accountId) return null;
  return {
    broker: "ib",
    connectionId: IB_PAPER_CONNECTION_ID,
    accountId,
    environment: "paper",
    availability: "offline",
  };
}

export function appendDemoJournalAccountIfMissing(accounts: TradingAccount[]): TradingAccount[] {
  const demo = resolveDemoJournalTradingAccount();
  if (!demo) return accounts;
  if (accounts.some((row) => row.accountId === demo.accountId)) return accounts;
  return [...accounts, demo];
}

export function isDemoJournalAccountId(accountId: string): boolean {
  const demoId = resolveDemoJournalAccountIdForPicker();
  return demoId != null && accountId === demoId;
}

export function isDemoJournalUserEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === DEMO_JOURNAL_USER_EMAIL;
}

/** Demo journal sessions default to the offline demo account when it is listed. */
export function resolveDefaultTradingAccountIdForUser(
  accounts: TradingAccount[],
  userEmail: string | null | undefined,
  preferred?: string | null,
): string {
  const demoId = resolveDemoJournalAccountIdForPicker();
  if (
    isDemoJournalUserEmail(userEmail) &&
    demoId &&
    accounts.some((row) => row.accountId === demoId)
  ) {
    return demoId;
  }
  return resolveTradingAccountId(accounts, preferred);
}

export function isListAccountsInfrastructureError(error: unknown): boolean {
  if (error && typeof error === "object" && "category" in error) {
    const category = (error as { category?: string }).category;
    if (category === "sidecar_unreachable" || category === "disabled") {
      return true;
    }
  }
  if (error instanceof TradingValidationError) {
    return error.message.includes("Trading is not configured");
  }
  return false;
}
