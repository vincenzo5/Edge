import { describe, expect, it } from "vitest";
import {
  deriveTradeOutcomeStatus,
  formatDaySummaryDate,
  formatDirectionLabel,
  formatInstrumentLabel,
  formatNetRoi,
  formatTradeCloseTime,
  formatTradeHeaderStatus,
  formatTradeListDate,
  formatTradeMoney,
  formatTradeShares,
  formatTradeSharesAndNotional,
  outcomeToneClass,
  pnlToneClass,
  tradeOutcomeLabel,
} from "@/lib/journal/journalTradeDisplay";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const baseTrade = (partial: Partial<JournalTradeResponse>): JournalTradeResponse => ({
  id: "t1",
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-07-01T13:30:00.000Z",
  closedAt: "2026-07-01T16:00:00.000Z",
  netPnL: 100,
  fillExecIds: ["e1"],
  tags: [],
  setup: null,
  reviewNote: null,
  createdAt: "2026-07-01T13:30:00.000Z",
  updatedAt: "2026-07-01T16:00:00.000Z",
  ...partial,
});

describe("journalTradeDisplay", () => {
  it("maps open trades to OPEN", () => {
    expect(deriveTradeOutcomeStatus(baseTrade({ status: "open", closedAt: null, netPnL: null }))).toBe(
      "open",
    );
    expect(tradeOutcomeLabel("open")).toBe("OPEN");
  });

  it("maps closed P&L to win, loss, or breakeven", () => {
    expect(deriveTradeOutcomeStatus(baseTrade({ netPnL: 50 }))).toBe("win");
    expect(deriveTradeOutcomeStatus(baseTrade({ netPnL: -20 }))).toBe("loss");
    expect(deriveTradeOutcomeStatus(baseTrade({ netPnL: 0 }))).toBe("breakeven");
    expect(tradeOutcomeLabel("win")).toBe("WIN");
    expect(tradeOutcomeLabel("loss")).toBe("LOSS");
    expect(tradeOutcomeLabel("breakeven")).toBe("BE");
  });

  it("formats day summary date", () => {
    expect(formatDaySummaryDate("2024-07-08")).toBe("Mon, Jul 08, 2024");
  });

  it("formats trade close time in ET", () => {
    expect(formatTradeCloseTime("2026-06-02T00:00:00.000Z")).toBe("20:00:00");
  });

  it("formats direction labels", () => {
    expect(formatDirectionLabel("long")).toBe("LONG");
    expect(formatDirectionLabel("short")).toBe("SHORT");
  });

  it("formats share quantity and notional", () => {
    expect(formatTradeShares(100)).toBe("100 sh");
    expect(formatTradeShares(-50)).toBe("50 sh");
    expect(formatTradeShares(null)).toBe("—");
    expect(
      formatTradeSharesAndNotional(
        baseTrade({ avgEntry: 150.25, netQuantity: 100, secType: "STK" }),
        100,
      ),
    ).toBe("Qty 100 sh ($15,025.00)");
  });

  it("formats net ROI from position notional", () => {
    expect(
      formatNetRoi(
        baseTrade({
          netPnL: -11,
          avgEntry: 100,
          netQuantity: 10,
        }),
      ),
    ).toBe("(1.10%)");
    expect(
      formatNetRoi(
        baseTrade({
          netPnL: 21,
          avgEntry: 100,
          netQuantity: 10,
        }),
      ),
    ).toBe("2.10%");
    expect(formatNetRoi(baseTrade({ netPnL: 100, avgEntry: null }))).toBe("—");
  });

  it("formats net ROI with a resolved share quantity for closed flat positions", () => {
    expect(
      formatNetRoi(
        baseTrade({
          avgEntry: 644.62,
          netQuantity: 0,
          netPnL: 676,
        }),
        100,
      ),
    ).toBe("1.05%");
  });

  it("formats instrument label", () => {
    expect(formatInstrumentLabel(baseTrade({ symbol: "BTCUSD" }))).toBe("BTCUSD");
    expect(
      formatInstrumentLabel(
        baseTrade({
          symbol: "SPY",
          secType: "BAG",
          legs: [{ symbol: "SPY" }, { symbol: "SPY" }],
        }),
      ),
    ).toBe("BAG");
  });

  it("formats trade list date as MM/DD/YYYY in ET", () => {
    expect(formatTradeListDate("2024-07-08T16:00:00.000Z")).toBe("07/08/2024");
    expect(formatTradeListDate(null)).toBe("—");
  });

  it("formats trade header status for open and closed trades", () => {
    expect(formatTradeHeaderStatus(baseTrade({ status: "open", closedAt: null, netPnL: null }))).toEqual({
      label: "OPEN",
      pnl: null,
      tone: "open",
    });
    expect(formatTradeHeaderStatus(baseTrade({ netPnL: 50 }))).toEqual({
      label: "WIN",
      pnl: "$50.00",
      tone: "win",
    });
    expect(formatTradeHeaderStatus(baseTrade({ netPnL: -20 }))).toEqual({
      label: "LOSS",
      pnl: "-$20.00",
      tone: "loss",
    });
    expect(outcomeToneClass("win")).toContain("edge-positive");
    expect(outcomeToneClass("loss")).toContain("edge-negative");
  });

  it("formats trade money and pnl tone class", () => {
    expect(formatTradeMoney(1540.18)).toBe("$1,540.18");
    expect(formatTradeMoney(null)).toBe("—");
    expect(pnlToneClass(100)).toContain("edge-positive");
    expect(pnlToneClass(-50)).toContain("edge-negative");
    expect(pnlToneClass(0)).toBe("");
  });
});
