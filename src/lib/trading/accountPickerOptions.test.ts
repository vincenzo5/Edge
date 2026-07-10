import { describe, expect, it } from "vitest";
import {
  accountPickerLabel,
  buildAccountPickerOptions,
  buildJournalOnlyAccount,
  findAccountByKey,
  isGatewayTradingAccount,
  resolveActiveAccountMatch,
  tradingAccountKey,
} from "./accountPickerOptions";
import type { TradingAccount } from "./types";

const paperAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-paper",
  accountId: "DUP586813",
  environment: "paper",
};

const liveAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-live",
  accountId: "DUP586813",
  environment: "live",
};

describe("accountPickerOptions", () => {
  it("builds distinct composite keys for paper and live with same accountId", () => {
    expect(tradingAccountKey(paperAccount)).toBe("ib-paper::DUP586813");
    expect(tradingAccountKey(liveAccount)).toBe("ib-live::DUP586813");
  });

  it("labels journal-only accounts", () => {
    expect(accountPickerLabel(buildJournalOnlyAccount("U25026894"))).toBe(
      "U25026894 (journal)",
    );
  });

  it("unions journal-only accounts not present on gateway", () => {
    const options = buildAccountPickerOptions(
      [paperAccount, liveAccount],
      ["U25026894", "DUP586813"],
    );
    expect(options).toHaveLength(3);
    expect(options[2]).toEqual(buildJournalOnlyAccount("U25026894"));
  });

  it("finds account by composite key", () => {
    const options = [paperAccount, liveAccount];
    expect(findAccountByKey(options, "ib-live::DUP586813")).toEqual(liveAccount);
  });

  it("resolves stored active account by connectionId and accountId", () => {
    const options = [paperAccount, liveAccount];
    expect(resolveActiveAccountMatch(options, liveAccount, "DUP586813")).toEqual(
      liveAccount,
    );
  });

  it("treats journal-only accounts as non-gateway", () => {
    expect(isGatewayTradingAccount(buildJournalOnlyAccount("U25026894"))).toBe(false);
    expect(isGatewayTradingAccount(paperAccount)).toBe(true);
  });
});
