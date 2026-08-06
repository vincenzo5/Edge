import { describe, expect, it, afterEach, beforeEach } from "vitest";

import {
  appendDemoJournalAccountIfMissing,
  isDemoJournalAccountId,
  resolveDefaultTradingAccountIdForUser,
  resolveDemoJournalTradingAccount,
} from "@/lib/trading/demoJournalAccount";
import { clearActiveTradingAccount, writeActiveTradingAccount } from "@/lib/trading/activeAccount";
import type { TradingAccount } from "@/lib/trading/types";

describe("demoJournalAccount", () => {
  afterEach(() => {
    delete process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID;
  });

  it("returns null when demo env is unset", () => {
    expect(resolveDemoJournalTradingAccount()).toBeNull();
    expect(isDemoJournalAccountId("DEMO0001")).toBe(false);
  });

  it("builds offline paper demo account when env is set", () => {
    process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID = "DEMO0001";
    const demo = resolveDemoJournalTradingAccount();
    expect(demo).toEqual({
      broker: "ib",
      connectionId: "ib-paper",
      accountId: "DEMO0001",
      environment: "paper",
      availability: "offline",
    });
    expect(isDemoJournalAccountId("DEMO0001")).toBe(true);
  });

  it("appends demo account once when missing from discovery list", () => {
    process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID = "DEMO0001";
    const paper: TradingAccount = {
      broker: "ib",
      connectionId: "ib-paper",
      accountId: "DU123",
      environment: "paper",
      availability: "online",
    };
    const merged = appendDemoJournalAccountIfMissing([paper]);
    expect(merged).toHaveLength(2);
    expect(merged[1]?.accountId).toBe("DEMO0001");
    expect(appendDemoJournalAccountIfMissing(merged)).toEqual(merged);
  });

  it("prefers demo account as default for demo@localhost", () => {
    process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID = "DEMO0001";
    const gateway: TradingAccount = {
      broker: "ib",
      connectionId: "ib-paper",
      accountId: "DU123",
      environment: "paper",
    };
    const demo: TradingAccount = {
      broker: "ib",
      connectionId: "ib-paper",
      accountId: "DEMO0001",
      environment: "paper",
      availability: "offline",
    };
    expect(resolveDefaultTradingAccountIdForUser([gateway, demo], "demo@localhost")).toBe(
      "DEMO0001",
    );
  });

  it("keeps stored active account for non-demo users", () => {
    process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID = "DEMO0001";
    const gateway: TradingAccount = {
      broker: "ib",
      connectionId: "ib-paper",
      accountId: "DU123",
      environment: "paper",
    };
    writeActiveTradingAccount(gateway);
    expect(resolveDefaultTradingAccountIdForUser([gateway], "dev@localhost")).toBe("DU123");
    clearActiveTradingAccount();
  });
});
