import { describe, expect, it } from "vitest";
import {
  deriveTradeOutcomeStatus,
  formatDaySummaryDate,
  formatDirectionLabel,
  formatInstrumentLabel,
  formatNetRoi,
  formatTradeCloseTime,
  formatTradeListDate,
  formatTradeMoney,
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

  it("formats trade money and pnl tone class", () => {
    expect(formatTradeMoney(1540.18)).toBe("$1,540.18");
    expect(formatTradeMoney(null)).toBe("—");
    expect(pnlToneClass(100)).toContain("edge-positive");
    expect(pnlToneClass(-50)).toContain("edge-negative");
    expect(pnlToneClass(0)).toBe("");
  });
});
