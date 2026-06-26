import { describe, it, expect } from "vitest";
import {
  expirationToIbkrMonth,
  ibkrMaturityToExpiration,
  mapIbkrOptionContract,
} from "./optionsProvider";
import { optionsChainResponseSchema } from "../../schemas/response";

describe("IBKR options date helpers", () => {
  it("converts YYYY-MM-DD to IBKR month token", () => {
    expect(expirationToIbkrMonth("2025-06-20")).toBe("JUN25");
    expect(expirationToIbkrMonth("2024-12-06")).toBe("DEC24");
  });

  it("rejects invalid expiration formats", () => {
    expect(expirationToIbkrMonth("06/20/2025")).toBeNull();
    expect(expirationToIbkrMonth("2025-6-20")).toBeNull();
  });

  it("converts IBKR maturityDate to YYYY-MM-DD", () => {
    expect(ibkrMaturityToExpiration("20250620")).toBe("2025-06-20");
    expect(ibkrMaturityToExpiration("2025-06-20")).toBe("2025-06-20");
  });
});

describe("mapIbkrOptionContract", () => {
  it("maps call contract with snapshot fields", () => {
    const contract = mapIbkrOptionContract(
      {
        conid: 123,
        symbol: "AAPL  250620C00150000",
        strike: 150,
        right: "C",
        maturityDate: "20250620",
      },
      "AAPL",
      "2025-06-20",
      {
        conid: 123,
        "84": "1.20",
        "86": "1.30",
        "31": "1.25",
        "87": "100",
        "7638": "5000",
        "7633": "0.25",
        "7308": "0.55",
        "7309": "0.12",
        "7310": "-0.03",
        "7311": "0.08",
      },
    );
    expect(contract?.type).toBe("call");
    expect(contract?.strike).toBe(150);
    expect(contract?.bid).toBe(1.2);
    expect(contract?.ask).toBe(1.3);
    expect(contract?.mark).toBeCloseTo(1.25);
    expect(contract?.openInterest).toBe(5000);
    expect(contract?.delta).toBe(0.55);
    expect(contract?.gamma).toBe(0.12);
    expect(contract?.theta).toBe(-0.03);
    expect(contract?.vega).toBe(0.08);
  });

  it("returns null for malformed rows", () => {
    expect(
      mapIbkrOptionContract(
        { conid: 1, strike: 150, right: "X" },
        "AAPL",
        "2025-06-20",
      ),
    ).toBeNull();
  });

  it("drops contracts with bid above ask via chain schema", () => {
    const contract = mapIbkrOptionContract(
      {
        conid: 123,
        symbol: "AAPL  250620C00150000",
        strike: 150,
        right: "C",
      },
      "AAPL",
      "2025-06-20",
      { conid: 123, "84": "2", "86": "1" },
    );
    expect(contract).not.toBeNull();
    const parsed = optionsChainResponseSchema.safeParse({
      underlying: "AAPL",
      expiration: "2025-06-20",
      contracts: [contract],
    });
    expect(parsed.success).toBe(false);
  });
});
