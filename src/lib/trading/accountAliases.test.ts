import { describe, expect, it, beforeEach } from "vitest";
import {
  ACCOUNT_ALIASES_STORAGE_KEY,
  readAccountAliases,
  resolveAccountDisplayName,
  setAccountAlias,
  writeAccountAliases,
} from "./accountAliases";
import type { TradingAccount } from "./types";

const paperAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-paper",
  accountId: "DUP586813",
  environment: "paper",
  availability: "online",
};

describe("accountAliases", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns accountId when no alias is set", () => {
    expect(resolveAccountDisplayName(paperAccount, {})).toBe("DUP586813");
    expect(resolveAccountDisplayName(paperAccount, null)).toBe("DUP586813");
  });

  it("returns trimmed alias when set for composite key", () => {
    const aliases = { "ib-paper::DUP586813": "  Paper IRA  " };
    expect(resolveAccountDisplayName(paperAccount, aliases)).toBe("Paper IRA");
  });

  it("writes and reads aliases from localStorage", () => {
    writeAccountAliases({ "ib-paper::DUP586813": "Paper IRA" });
    expect(readAccountAliases()).toEqual({ "ib-paper::DUP586813": "Paper IRA" });
  });

  it("setAccountAlias trims and deletes empty aliases", () => {
    const withAlias = setAccountAlias({}, paperAccount, "  Paper IRA  ");
    expect(withAlias).toEqual({ "ib-paper::DUP586813": "Paper IRA" });
    expect(readAccountAliases()).toEqual({ "ib-paper::DUP586813": "Paper IRA" });

    const cleared = setAccountAlias(withAlias, paperAccount, "   ");
    expect(cleared).toEqual({});
    expect(readAccountAliases()).toEqual({});
  });

  it("ignores invalid localStorage payloads", () => {
    window.localStorage.setItem(ACCOUNT_ALIASES_STORAGE_KEY, JSON.stringify(["bad"]));
    expect(readAccountAliases()).toEqual({});
  });
});
