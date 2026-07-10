import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVE_TRADING_ACCOUNT_KEY,
  clearActiveTradingAccount,
  readActiveTradingAccount,
  resolveTradingAccountId,
  writeActiveTradingAccount,
} from "./activeAccount";
import type { TradingAccount } from "./types";

const accounts: TradingAccount[] = [
  {
    broker: "ib",
    connectionId: "tws-sidecar",
    accountId: "DUP586813",
    environment: "paper",
  },
  {
    broker: "ib",
    connectionId: "tws-sidecar",
    accountId: "DU999999",
    environment: "paper",
  },
];

describe("activeAccount", () => {
  beforeEach(() => {
    clearActiveTradingAccount();
    delete process.env.TWS_ACCOUNT_ID;
  });

  afterEach(() => {
    clearActiveTradingAccount();
    delete process.env.TWS_ACCOUNT_ID;
  });

  it("persists and reads active trading account in localStorage", () => {
    writeActiveTradingAccount(accounts[0]!);
    expect(readActiveTradingAccount()?.accountId).toBe("DUP586813");
    expect(localStorage.getItem(ACTIVE_TRADING_ACCOUNT_KEY)).toContain("DUP586813");
  });

  it("resolves preferred account when managed", () => {
    expect(resolveTradingAccountId(accounts, "DU999999")).toBe("DU999999");
  });

  it("falls back to stored active account", () => {
    writeActiveTradingAccount(accounts[1]!);
    expect(resolveTradingAccountId(accounts)).toBe("DU999999");
  });

  it("falls back to env account before first managed account", () => {
    process.env.TWS_ACCOUNT_ID = "DUP586813";
    expect(resolveTradingAccountId(accounts)).toBe("DUP586813");
  });

  it("falls back to first managed account", () => {
    expect(resolveTradingAccountId(accounts)).toBe("DUP586813");
  });
});
