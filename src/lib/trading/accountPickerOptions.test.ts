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

  it("labels offline live accounts", () => {
    expect(accountPickerLabel(offlineLiveAccount)).toBe("U25026894 (live, offline)");
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
