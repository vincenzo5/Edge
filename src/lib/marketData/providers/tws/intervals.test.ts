import { describe, it, expect } from "vitest";
import { mapTwsBarSize, mapTwsDuration } from "./intervals";

describe("tws intervals", () => {
  it("maps chart intervals to TWS bar sizes", () => {
    expect(mapTwsBarSize("1d")).toBe("1 day");
    expect(mapTwsBarSize("5m")).toBe("5 mins");
    expect(mapTwsBarSize("1wk")).toBe("1 week");
  });

  it("maps chart ranges to TWS durations", () => {
    expect(mapTwsDuration("1mo")).toBe("1 M");
    expect(mapTwsDuration("5d")).toBe("5 D");
    expect(mapTwsDuration("max")).toBe("10 Y");
  });
});
