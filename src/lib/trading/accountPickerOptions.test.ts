import { describe, expect, it } from "vitest";
import {
  accountPickerLabel,
  buildAccountPickerOptions,
  findAccountByKey,
  isGatewayTradingAccount,
  isOnlineTradingAccount,
  JOURNAL_CONNECTION_ID,
  resolveActiveAccountMatch,
  tradingAccountKey,
} from "./accountPickerOptions";
import type { TradingAccount } from "./types";

const paperAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-paper",
  accountId: "DUP586813",
  environment: "paper",
  availability: "online",
};

const liveAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-live",
  accountId: "U25026894",
  environment: "live",
  availability: "online",
};

const offlineLiveAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-live",
  accountId: "U25026894",
  environment: "live",
  availability: "offline",
};

const demoAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-paper",
  accountId: "DEMO0001",
  environment: "paper",
  availability: "offline",
};

describe("accountPickerOptions", () => {
  it("builds distinct composite keys for paper and live with same accountId", () => {
    const sharedIdPaper: TradingAccount = { ...paperAccount, accountId: "DUP586813" };
    const sharedIdLive: TradingAccount = {
      ...liveAccount,
      accountId: "DUP586813",
      connectionId: "ib-live",
    };
    expect(tradingAccountKey(sharedIdPaper)).toBe("ib-paper::DUP586813");
    expect(tradingAccountKey(sharedIdLive)).toBe("ib-live::DUP586813");
  });

  it("labels accounts as Label (accountId)", () => {
    expect(accountPickerLabel(paperAccount)).toBe("Paper (DUP586813)");
    expect(accountPickerLabel(liveAccount)).toBe("Live (U25026894)");
  });

  it("labels offline live accounts", () => {
    expect(accountPickerLabel(offlineLiveAccount)).toBe("Live (U25026894, offline)");
  });

  it("labels demo journal account as Demo", () => {
    process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID = "DEMO0001";
    expect(accountPickerLabel(demoAccount)).toBe("Demo (DEMO0001, offline)");
    delete process.env.EDGE_DEMO_JOURNAL_ACCOUNT_ID;
  });

  it("uses alias in picker label when provided", () => {
    const aliases = { "ib-paper::DUP586813": "Paper IRA" };
    expect(accountPickerLabel(paperAccount, aliases)).toBe("Paper IRA (DUP586813)");
    expect(accountPickerLabel(offlineLiveAccount, { "ib-live::U25026894": "Live IRA" })).toBe(
      "Live IRA (U25026894, offline)",
    );
  });

  it("returns gateway accounts only without journal union", () => {
    const options = buildAccountPickerOptions([paperAccount, liveAccount]);
    expect(options).toEqual([paperAccount, liveAccount]);
  });

  it("finds account by composite key", () => {
    const options = [paperAccount, liveAccount];
    expect(findAccountByKey(options, "ib-live::U25026894")).toEqual(liveAccount);
  });

  it("resolves stored active account by connectionId and accountId", () => {
    const options = [paperAccount, liveAccount];
    expect(resolveActiveAccountMatch(options, liveAccount, "U25026894")).toEqual(
      liveAccount,
    );
  });

  it("remaps legacy journal-only stored selection to gateway account by accountId", () => {
    const options = [paperAccount, liveAccount];
    const legacy = {
      broker: "ib" as const,
      connectionId: JOURNAL_CONNECTION_ID,
      accountId: "U25026894",
      environment: "paper" as const,
    };
    expect(resolveActiveAccountMatch(options, legacy, "U25026894")).toEqual(liveAccount);
  });

  it("treats offline live accounts as non-tradable", () => {
    expect(isOnlineTradingAccount(offlineLiveAccount)).toBe(false);
    expect(isGatewayTradingAccount(offlineLiveAccount)).toBe(false);
    expect(isGatewayTradingAccount(paperAccount)).toBe(true);
  });
});
