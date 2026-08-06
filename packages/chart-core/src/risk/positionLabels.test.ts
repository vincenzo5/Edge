import { describe, expect, it } from "vitest";
import {
  formatEntryLabels,
  formatStopLabel,
  formatTargetLabel,
  resolvePositionQtyForDisplay,
} from "./positionLabels";

const baseInput = {
  entry: 100,
  stop: 95,
  target: 110,
  leftTimestamp: 1000,
  rightTimestamp: 3000,
  direction: "long" as const,
  qty: 2,
};

describe("positionLabels", () => {
  it("formats target label with delta, percent, and amount when qty set", () => {
    const label = formatTargetLabel(baseInput);
    expect(label).toContain("Target:");
    expect(label).toContain("10");
    expect(label).toContain("Amount:");
    expect(label).toContain("20");
  });

  it("omits amount on target label when qty unavailable", () => {
    const label = formatTargetLabel({ ...baseInput, qty: null });
    expect(label).toContain("Target:");
    expect(label).not.toContain("Amount:");
  });

  it("formats stop label with delta, percent, and amount when qty set", () => {
    const label = formatStopLabel(baseInput);
    expect(label).toContain("Stop:");
    expect(label).toContain("5");
    expect(label).toContain("Amount:");
    expect(label).toContain("10");
  });

  it("omits amount on stop label when qty unavailable", () => {
    const label = formatStopLabel({ ...baseInput, qty: undefined });
    expect(label).not.toContain("Amount:");
  });

  it("formats entry labels with open pnl and risk reward when qty set", () => {
    const [line1, line2] = formatEntryLabels({ ...baseInput, lastPrice: 105 });
    expect(line1).toContain("Open PnL:");
    expect(line1).toContain("Qty: 2");
    expect(line2).toContain("Risk/reward ratio: 2");
  });

  it("shows unavailable qty without open pnl when qty missing", () => {
    const [line1, line2] = formatEntryLabels({ ...baseInput, qty: null, lastPrice: 105 });
    expect(line1).toBe("Qty: —");
    expect(line2).toContain("Risk/reward ratio:");
  });

  it("resolvePositionQtyForDisplay returns stored qty only", () => {
    expect(resolvePositionQtyForDisplay(5)).toBe(5);
    expect(resolvePositionQtyForDisplay(undefined)).toBeNull();
    expect(resolvePositionQtyForDisplay(0)).toBeNull();
  });
});
