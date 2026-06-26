import { describe, it, expect } from "vitest";
import { mapIbkrBar, mapIbkrPeriod } from "./intervals";

describe("IBKR interval mapping", () => {
  it("maps chart intervals to IBKR bar sizes", () => {
    expect(mapIbkrBar("1m")).toBe("1min");
    expect(mapIbkrBar("5m")).toBe("5mins");
    expect(mapIbkrBar("1d")).toBe("1d");
    expect(mapIbkrBar("1wk")).toBe("1w");
    expect(mapIbkrBar("1mo")).toBe("1m");
  });

  it("maps chart ranges to IBKR periods", () => {
    expect(mapIbkrPeriod("5d")).toBe("5d");
    expect(mapIbkrPeriod("1mo")).toBe("1m");
    expect(mapIbkrPeriod("1y")).toBe("1y");
    expect(mapIbkrPeriod("max")).toBe("10y");
  });
});
