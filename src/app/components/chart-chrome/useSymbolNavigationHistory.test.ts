import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { DEFAULT_CELL } from "@/lib/chartConfig";
import { useSymbolNavigationHistory } from "./useSymbolNavigationHistory";

function cell(
  symbol: string,
  overrides: Partial<typeof DEFAULT_CELL> = {},
) {
  return {
    ...DEFAULT_CELL,
    symbol,
    symbolName: overrides.symbolName ?? symbol,
    exchange: overrides.exchange ?? "NYSE",
    ...overrides,
  };
}

describe("useSymbolNavigationHistory", () => {
  it("seeds the initial symbol on first hydrated render and disables back until a second symbol", () => {
    const { result, rerender } = renderHook(
      ({ cells, activeCellIndex, hydrated }) =>
        useSymbolNavigationHistory({ cells, activeCellIndex, hydrated }),
      {
        initialProps: {
          cells: [cell("XLV")],
          activeCellIndex: 0,
          hydrated: true,
        },
      },
    );

    expect(result.current.canBack).toBe(false);
    expect(result.current.canForward).toBe(false);

    rerender({
      cells: [cell("AAPL", { symbolName: "Apple", exchange: "NASDAQ" })],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(true);
    expect(result.current.canForward).toBe(false);
  });

  it("returns to the seeded initial symbol when navigating back", () => {
    const { result, rerender } = renderHook(
      ({ cells, activeCellIndex, hydrated }) =>
        useSymbolNavigationHistory({ cells, activeCellIndex, hydrated }),
      {
        initialProps: {
          cells: [cell("XLV")],
          activeCellIndex: 0,
          hydrated: true,
        },
      },
    );

    rerender({
      cells: [cell("AAPL", { symbolName: "Apple", exchange: "NASDAQ" })],
      activeCellIndex: 0,
      hydrated: true,
    });
    rerender({
      cells: [cell("MSFT", { symbolName: "Microsoft", exchange: "NASDAQ" })],
      activeCellIndex: 0,
      hydrated: true,
    });

    let previous: ReturnType<typeof result.current.navigate> = null;
    act(() => {
      previous = result.current.navigate(0, "back");
    });
    rerender({
      cells: [cell("AAPL", { symbolName: "Apple", exchange: "NASDAQ" })],
      activeCellIndex: 0,
      hydrated: true,
    });
    expect(previous?.symbol).toBe("AAPL");
    expect(result.current.canForward).toBe(true);

    act(() => {
      previous = result.current.navigate(0, "back");
    });
    rerender({
      cells: [cell("XLV")],
      activeCellIndex: 0,
      hydrated: true,
    });
    expect(previous?.symbol).toBe("XLV");
    expect(result.current.canBack).toBe(false);
    expect(result.current.canForward).toBe(true);
  });

  it("does not push a new entry when navigating back or forward", () => {
    const { result, rerender } = renderHook(
      ({ cells, activeCellIndex, hydrated }) =>
        useSymbolNavigationHistory({ cells, activeCellIndex, hydrated }),
      {
        initialProps: {
          cells: [cell("XLV")],
          activeCellIndex: 0,
          hydrated: true,
        },
      },
    );

    rerender({
      cells: [cell("AAPL")],
      activeCellIndex: 0,
      hydrated: true,
    });
    rerender({
      cells: [cell("MSFT")],
      activeCellIndex: 0,
      hydrated: true,
    });

    act(() => {
      result.current.navigate(0, "back");
    });
    rerender({
      cells: [cell("AAPL")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canForward).toBe(true);

    act(() => {
      result.current.navigate(0, "forward");
    });
    rerender({
      cells: [cell("MSFT")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canForward).toBe(false);
    expect(result.current.canBack).toBe(true);
  });

  it("ignores duplicate consecutive symbol changes", () => {
    const { result, rerender } = renderHook(
      ({ cells, activeCellIndex, hydrated }) =>
        useSymbolNavigationHistory({ cells, activeCellIndex, hydrated }),
      {
        initialProps: {
          cells: [cell("AAPL")],
          activeCellIndex: 0,
          hydrated: true,
        },
      },
    );

    rerender({
      cells: [cell("MSFT")],
      activeCellIndex: 0,
      hydrated: true,
    });
    rerender({
      cells: [cell("MSFT")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(true);
    expect(result.current.canForward).toBe(false);
  });

  it("does not track symbols before hydration completes", () => {
    const { result, rerender } = renderHook(
      ({ cells, activeCellIndex, hydrated }) =>
        useSymbolNavigationHistory({ cells, activeCellIndex, hydrated }),
      {
        initialProps: {
          cells: [cell("AAPL")],
          activeCellIndex: 0,
          hydrated: false,
        },
      },
    );

    expect(result.current.canBack).toBe(false);

    rerender({
      cells: [cell("XLV")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(false);

    rerender({
      cells: [cell("MSFT")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(true);

    let previous: ReturnType<typeof result.current.navigate> = null;
    act(() => {
      previous = result.current.navigate(0, "back");
    });
    rerender({
      cells: [cell("XLV")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(previous?.symbol).toBe("XLV");
  });

  it("tracks linked-cell symbol changes in each cell history", () => {
    const { result, rerender } = renderHook(
      ({ cells, activeCellIndex, hydrated }) =>
        useSymbolNavigationHistory({ cells, activeCellIndex, hydrated }),
      {
        initialProps: {
          cells: [cell("AAPL"), cell("IBM")],
          activeCellIndex: 0,
          hydrated: true,
        },
      },
    );

    rerender({
      cells: [cell("MSFT"), cell("MSFT")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(true);

    rerender({
      cells: [cell("MSFT"), cell("MSFT")],
      activeCellIndex: 1,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(true);

    let previous: ReturnType<typeof result.current.navigate> = null;
    act(() => {
      previous = result.current.navigate(1, "back");
    });
    rerender({
      cells: [cell("MSFT"), cell("IBM")],
      activeCellIndex: 1,
      hydrated: true,
    });

    expect(previous?.symbol).toBe("IBM");
  });

  it("keeps separate histories per chart cell", () => {
    const { result, rerender } = renderHook(
      ({ cells, activeCellIndex, hydrated }) =>
        useSymbolNavigationHistory({ cells, activeCellIndex, hydrated }),
      {
        initialProps: {
          cells: [cell("AAPL"), cell("IBM")],
          activeCellIndex: 0,
          hydrated: true,
        },
      },
    );

    rerender({
      cells: [cell("MSFT"), cell("IBM")],
      activeCellIndex: 0,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(true);

    rerender({
      cells: [cell("MSFT"), cell("IBM")],
      activeCellIndex: 1,
      hydrated: true,
    });

    expect(result.current.canBack).toBe(false);
  });
});
