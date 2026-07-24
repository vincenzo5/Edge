import { describe, expect, it } from "vitest";

import {
  lookupLivePosition,
  reconcileJournalOpensWithPositions,
  resolveLiveUnrealizedPnL,
} from "@/lib/journal/reconcileJournalOpens";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

function openTrade(
  partial: Partial<JournalTradeResponse> & Pick<JournalTradeResponse, "id" | "symbol">,
): JournalTradeResponse {
  return {
    status: "open",
    direction: "long",
    secType: "STK",
    openedAt: "2026-07-01T13:30:00.000Z",
    fillExecIds: ["e1"],
    createdAt: "2026-07-01T13:30:00.000Z",
    updatedAt: "2026-07-01T13:30:00.000Z",
    netQuantity: 1,
    ...partial,
  };
}

describe("reconcileJournalOpensWithPositions", () => {
  it("reports in sync when journal open matches live position", () => {
    const result = reconcileJournalOpensWithPositions(
      [
        openTrade({
          id: "t1",
          symbol: "F",
          netQuantity: 4,
          legs: [{ conId: 9599491, symbol: "F", secType: "STK" }],
        }),
      ],
      [
        {
          account: "U25026894",
          contract: { symbol: "F", secType: "STK", conId: 9599491 },
          position: 4,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(result.inSync).toBe(true);
  });

  it("reports in sync when stock open has no legs but live has conId", () => {
    const result = reconcileJournalOpensWithPositions(
      [
        openTrade({
          id: "t1",
          symbol: "F",
          netQuantity: 4,
        }),
      ],
      [
        {
          account: "U25026894",
          contract: { symbol: "F", secType: "STK", conId: 9599491 },
          position: 4,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(result.inSync).toBe(true);
  });

  it("reports in sync when journal short uses absolute qty and live is negative", () => {
    const result = reconcileJournalOpensWithPositions(
      [
        openTrade({
          id: "t1",
          symbol: "SPY",
          direction: "short",
          netQuantity: 100,
          legs: [{ conId: 756733, symbol: "SPY", secType: "STK" }],
        }),
      ],
      [
        {
          account: "U25026894",
          contract: { symbol: "SPY", secType: "STK", conId: 756733 },
          position: -100,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(result.inSync).toBe(true);
  });

  it("reports in sync for multi-leg spread vs per-leg live positions", () => {
    const result = reconcileJournalOpensWithPositions(
      [
        openTrade({
          id: "t1",
          symbol: "SPY",
          secType: "spread",
          netQuantity: 2,
          legs: [
            { conId: 1, symbol: "SPY", secType: "OPT", netQuantity: 1 },
            { conId: 2, symbol: "SPY", secType: "OPT", netQuantity: -1 },
          ],
        }),
      ],
      [
        {
          account: "U25026894",
          contract: { symbol: "SPY", secType: "OPT", conId: 1, localSymbol: "SPY 250815C600" },
          position: 1,
        } satisfies AccountPosition,
        {
          account: "U25026894",
          contract: { symbol: "SPY", secType: "OPT", conId: 2, localSymbol: "SPY 250815P600" },
          position: -1,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(result.inSync).toBe(true);
  });

  it("reports mismatch when journal has ghost open not on live book", () => {
    const result = reconcileJournalOpensWithPositions(
      [
        openTrade({
          id: "t1",
          symbol: "LLY",
          netQuantity: 24,
          legs: [{ conId: 123, symbol: "LLY", secType: "STK" }],
        }),
      ],
      [],
      "U25026894",
    );
    expect(result.inSync).toBe(false);
    expect(result.ghostInJournal).toHaveLength(1);
    expect(result.missingFromJournal).toHaveLength(0);
  });

  it("reports mismatch when live has position missing from journal", () => {
    const result = reconcileJournalOpensWithPositions(
      [],
      [
        {
          account: "U25026894",
          contract: { symbol: "F", secType: "STK", conId: 9599491 },
          position: 4,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(result.inSync).toBe(false);
    expect(result.missingFromJournal).toHaveLength(1);
  });
});

describe("lookupLivePosition", () => {
  it("matches by conId when present on trade leg", () => {
    const position = lookupLivePosition(
      openTrade({
        id: "t1",
        symbol: "F",
        legs: [{ conId: 9599491, symbol: "F", secType: "STK" }],
      }),
      [
        {
          account: "U25026894",
          contract: { symbol: "F", secType: "STK", conId: 9599491 },
          position: 4,
          unrealizedPNL: 125.5,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(position?.unrealizedPNL).toBe(125.5);
  });

  it("falls back to symbol when conId is missing", () => {
    const position = lookupLivePosition(
      openTrade({ id: "t1", symbol: "AAPL" }),
      [
        {
          account: "U25026894",
          contract: { symbol: "AAPL", secType: "STK" },
          position: 10,
          unrealizedPNL: -42,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(position?.unrealizedPNL).toBe(-42);
  });

  it("resolves symbol-only journal trade to live row with conId", () => {
    const position = lookupLivePosition(
      openTrade({ id: "t1", symbol: "F", netQuantity: 4 }),
      [
        {
          account: "U25026894",
          contract: { symbol: "F", secType: "STK", conId: 9599491 },
          position: 4,
          unrealizedPNL: 88,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(position?.unrealizedPNL).toBe(88);
  });

  it("scopes positions to active account id", () => {
    const position = lookupLivePosition(
      openTrade({ id: "t1", symbol: "AAPL" }),
      [
        {
          account: "OTHER",
          contract: { symbol: "AAPL", secType: "STK" },
          position: 10,
          unrealizedPNL: 99,
        } satisfies AccountPosition,
      ],
      "U25026894",
    );
    expect(position).toBeNull();
  });
});

describe("resolveLiveUnrealizedPnL", () => {
  it("returns null when no matching live position", () => {
    expect(
      resolveLiveUnrealizedPnL(openTrade({ id: "t1", symbol: "MSFT" }), [], "U25026894"),
    ).toBeNull();
  });

  it("returns unrealized PnL from matched position", () => {
    expect(
      resolveLiveUnrealizedPnL(
        openTrade({
          id: "t1",
          symbol: "F",
          legs: [{ conId: 9599491, symbol: "F", secType: "STK" }],
        }),
        [
          {
            account: "U25026894",
            contract: { symbol: "F", secType: "STK", conId: 9599491 },
            position: 4,
            unrealizedPNL: 3441,
          } satisfies AccountPosition,
        ],
        "U25026894",
      ),
    ).toBe(3441);
  });
});
