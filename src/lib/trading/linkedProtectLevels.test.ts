import { describe, expect, it } from "vitest";
import {
  computeProtectLegValues,
  defaultProtectPrices,
  protectOffsetFromPrice,
  protectPriceFromOffset,
  protectPriceFromPercent,
  protectPriceFromUsd,
  updateProtectLegField,
} from "./linkedProtectLevels";

describe("linkedProtectLevels", () => {
  it("computes long stop offset and linked fields", () => {
    const values = computeProtectLegValues({
      entry: 100,
      price: 95,
      quantity: 10,
      direction: "long",
      leg: "stop",
    });
    expect(values.offset).toBe(5);
    expect(values.usd).toBe(50);
    expect(values.percent).toBe(5);
  });

  it("derives long target price from offset", () => {
    expect(
      protectPriceFromOffset({
        entry: 100,
        offset: 10,
        direction: "long",
        leg: "target",
      }),
    ).toBe(110);
  });

  it("derives short stop price from usd", () => {
    expect(
      protectPriceFromUsd({
        entry: 100,
        usd: 50,
        quantity: 10,
        direction: "short",
        leg: "stop",
      }),
    ).toBe(105);
  });

  it("updates leg price when percent changes", () => {
    expect(
      updateProtectLegField({
        entry: 100,
        quantity: 1,
        direction: "long",
        leg: "target",
        field: "percent",
        value: 10,
        currentPrice: 110,
      }),
    ).toBe(110);
  });

  it("computes short target offset from price", () => {
    expect(
      protectOffsetFromPrice({
        entry: 100,
        price: 90,
        direction: "short",
        leg: "target",
      }),
    ).toBe(10);
  });

  it("derives price from percent for short stop", () => {
    expect(
      protectPriceFromPercent({
        entry: 100,
        percent: 5,
        direction: "short",
        leg: "stop",
      }),
    ).toBe(105);
  });

  it("derives default protect prices for long entry", () => {
    const { stop, target } = defaultProtectPrices({ entry: 100, direction: "long" });
    expect(stop).toBe(98);
    expect(target).toBe(104);
  });
});
