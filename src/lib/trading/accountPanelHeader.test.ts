import { describe, expect, it } from "vitest";
import {
  accountEnvironmentSubtitle,
  resolveAccountPanelHeader,
} from "./accountPanelHeader";
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

describe("resolveAccountPanelHeader", () => {
  it("uses environment label as title with account id subtitle when no alias is set", () => {
    expect(resolveAccountPanelHeader(liveAccount, {})).toEqual({
      title: "Live",
      subtitle: "U25026894",
      hasAlias: false,
    });
    expect(resolveAccountPanelHeader(paperAccount, {})).toEqual({
      title: "Paper",
      subtitle: "DUP586813",
      hasAlias: false,
    });
  });

  it("uses alias as title with account id subtitle when alias is set", () => {
    expect(
      resolveAccountPanelHeader(paperAccount, { "ib-paper::DUP586813": "Paper IRA" }),
    ).toEqual({
      title: "Paper IRA",
      subtitle: "DUP586813 · Paper",
      hasAlias: true,
    });
  });

  it("shows offline live subtitle", () => {
    expect(
      resolveAccountPanelHeader(
        { ...liveAccount, availability: "offline" },
        { "ib-live::U25026894": "Main Live" },
      ),
    ).toEqual({
      title: "Main Live",
      subtitle: "U25026894 · Live, offline",
      hasAlias: true,
    });
  });

  it("returns Account fallback when account is missing", () => {
    expect(resolveAccountPanelHeader(null, {})).toEqual({
      title: "Account",
      subtitle: null,
      hasAlias: false,
    });
  });
});

describe("accountEnvironmentSubtitle", () => {
  it("labels offline live accounts", () => {
    expect(accountEnvironmentSubtitle({ environment: "live", availability: "offline" })).toBe(
      "Live, offline",
    );
  });
});
