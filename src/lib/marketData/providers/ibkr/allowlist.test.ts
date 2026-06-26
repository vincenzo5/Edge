import { describe, it, expect } from "vitest";
import { assertIbkrPathAllowed, isIbkrPathAllowed } from "./allowlist";

describe("IBKR read-only allowlist", () => {
  it("allows market data and auth paths", () => {
    expect(isIbkrPathAllowed("/tickle")).toBe(true);
    expect(isIbkrPathAllowed("/iserver/auth/status")).toBe(true);
    expect(isIbkrPathAllowed("/iserver/accounts")).toBe(true);
    expect(isIbkrPathAllowed("/iserver/marketdata/snapshot?conids=1")).toBe(true);
    expect(isIbkrPathAllowed("/iserver/marketdata/history?conid=1")).toBe(true);
    expect(isIbkrPathAllowed("/trsrv/stocks?symbols=AAPL")).toBe(true);
    expect(isIbkrPathAllowed("/iserver/contract/265598/info")).toBe(true);
  });

  it("blocks trading and account paths", () => {
    expect(isIbkrPathAllowed("/iserver/account/123/order")).toBe(false);
    expect(isIbkrPathAllowed("/iserver/account/orders")).toBe(false);
    expect(isIbkrPathAllowed("/iserver/reply/abc")).toBe(false);
    expect(isIbkrPathAllowed("/iserver/account/trades")).toBe(false);
    expect(isIbkrPathAllowed("/portfolio/accounts")).toBe(false);
    expect(isIbkrPathAllowed("/logout")).toBe(false);
  });

  it("allows option secdef paths", () => {
    expect(isIbkrPathAllowed("/iserver/secdef/strikes?conid=1")).toBe(true);
    expect(isIbkrPathAllowed("/iserver/secdef/info?conid=1")).toBe(true);
  });

  it("throws when asserting blocked paths", () => {
    expect(() => assertIbkrPathAllowed("/iserver/account/1/order")).toThrow(
      "IBKR read-only client blocked path",
    );
  });
});
