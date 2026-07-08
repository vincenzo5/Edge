/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OptionsChainView } from "./OptionsChainView";
import type { OptionsChainModel } from "./useOptionsChainModel";
import type { StrikeRow } from "@/lib/options/optionsClient";
import { DEFAULT_CELL } from "@/lib/chartConfig";

function makeModel(overrides?: Partial<OptionsChainModel>): OptionsChainModel {
  const contracts: StrikeRow[] = [
    {
      strike: 150,
      call: {
        contractSymbol: "AAPL260711C00150000",
        underlying: "AAPL",
        type: "call",
        expiration: "2026-07-11",
        strike: 150,
        bid: 1,
        ask: 1.2,
        last: 1.15,
        delta: 0.52,
        impliedVolatility: 0.35,
        volume: 100,
        openInterest: 500,
        updatedAt: Date.now(),
      },
      put: {
        contractSymbol: "AAPL260711P00150000",
        underlying: "AAPL",
        type: "put",
        expiration: "2026-07-11",
        strike: 150,
        bid: 0.9,
        ask: 1.0,
        last: 0.95,
        delta: -0.48,
        impliedVolatility: 0.34,
        volume: 80,
        openInterest: 400,
        updatedAt: Date.now(),
      },
    },
  ];

  return {
    snapshot: {
      chartId: "cell-0",
      config: { ...DEFAULT_CELL, symbol: "AAPL", drawings: [] },
    } as OptionsChainModel["snapshot"],
    symbol: "AAPL",
    spotPrice: 150,
    expirations: ["2026-07-11", "2026-07-18"],
    expMeta: { source: "massive" },
    expLoading: false,
    expError: null,
    primaryExpiration: "2026-07-11",
    chainMeta: { source: "massive" },
    chainLoading: false,
    chainError: null,
    contracts,
    chainContracts: contracts.flatMap((row) => [row.call, row.put].filter(Boolean)) as NonNullable<
      StrikeRow["call"]
    >[],
    chainMode: "atm",
    pinnedExpirations: [],
    presetStatuses: null,
    selectExpiration: vi.fn(),
    loadAllStrikes: vi.fn(),
    pinExpiration: vi.fn(),
    addRiskRulerPreset: vi.fn(),
    addRiskRulerFromCalc: vi.fn(),
    isExpirationPinned: () => false,
    ...overrides,
  };
}

describe("OptionsChainView", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders compact expiration labels and chain-first layout regions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 5, 12, 0, 0));

    render(<OptionsChainView model={makeModel()} variant="sidebar" />);

    expect(screen.getByTestId("options-chain-header")).toBeInTheDocument();
    expect(screen.getByTestId("options-chain-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("options-expiration-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("options-exp-2026-07-11")).toHaveTextContent("Jul 11");
    expect(screen.getByTestId("options-exp-dte-2026-07-11")).toHaveTextContent("6d");
    expect(screen.getByTestId("options-risk-ruler-presets")).toBeInTheDocument();
    expect(screen.getByTestId("options-risk-preset-long_call")).toBeInTheDocument();
    expect(screen.getByText("Spot 150.00")).toBeInTheDocument();
    expect(screen.queryByText(/Spot 150\.00 · Jul 11/)).toBeNull();
  });

  it("renders 7-column chain with last prices adjacent to strike spine", () => {
    render(<OptionsChainView model={makeModel()} variant="sidebar" />);

    expect(screen.getByTestId("options-chain-table")).toBeInTheDocument();
    expect(screen.getByTestId("options-chain-strike-header")).toBeInTheDocument();
    expect(screen.getByTestId("options-chain-strike-150")).toHaveTextContent("150");

    const headers = screen.getAllByRole("columnheader");
    const headerTexts = headers.map((el) => el.textContent);
    expect(headerTexts.filter((text) => text === "Last")).toHaveLength(2);
    expect(headerTexts.filter((text) => text === "Bid")).toHaveLength(2);
  });

  it("shows call-only greeks popover on call cell hover", async () => {
    render(<OptionsChainView model={makeModel()} variant="sidebar" />);

    const row = screen.getByTestId("options-chain-row-150");
    const callBidCell = row.querySelectorAll("td")[0];
    fireEvent.mouseEnter(callBidCell!);

    await waitFor(
      () => {
        expect(screen.getByTestId("options-chain-call-greeks-150")).toBeInTheDocument();
      },
      { timeout: 500 },
    );
    expect(screen.getByTestId("options-chain-call-greeks-150")).toHaveTextContent("CALL 150C");
    expect(screen.getByTestId("options-chain-call-greeks-150-header").className).toContain(
      "edge-accent-blue",
    );
    expect(screen.queryByTestId("options-chain-put-greeks-150")).toBeNull();
    expect(screen.getByTestId("options-chain-call-greeks-150")).not.toHaveTextContent("PUT 150P");
  });

  it("shows put-only greeks popover on put cell hover", async () => {
    render(<OptionsChainView model={makeModel()} variant="sidebar" />);

    const row = screen.getByTestId("options-chain-row-150");
    const putLastCell = row.querySelectorAll("td")[4];
    fireEvent.mouseEnter(putLastCell!);

    await waitFor(
      () => {
        expect(screen.getByTestId("options-chain-put-greeks-150")).toBeInTheDocument();
      },
      { timeout: 500 },
    );
    expect(screen.getByTestId("options-chain-put-greeks-150")).toHaveTextContent("PUT 150P");
    expect(screen.queryByTestId("options-chain-call-greeks-150")).toBeNull();
  });

  it("does not show greeks popover on strike column hover", async () => {
    render(<OptionsChainView model={makeModel()} variant="sidebar" />);

    fireEvent.mouseEnter(screen.getByTestId("options-chain-strike-150"));

    await waitFor(() => {}, { timeout: 300 });
    expect(screen.queryByTestId("options-chain-call-greeks-150")).toBeNull();
    expect(screen.queryByTestId("options-chain-put-greeks-150")).toBeNull();
  });

  it("renders preset buttons in footer without expand", () => {
    render(<OptionsChainView model={makeModel()} variant="sidebar" />);

    expect(screen.getByTestId("options-risk-preset-long_call")).toBeInTheDocument();
    expect(screen.getByTestId("options-risk-preset-bull_call_debit_spread")).toBeInTheDocument();
    expect(screen.getByTestId("options-risk-preset-bear_put_debit_spread")).toBeInTheDocument();
    expect(screen.getByTestId("options-risk-preset-iron_condor")).toBeInTheDocument();
  });

  it("shows pin badge on pinned expiration without inline pinned text", () => {
    render(
      <OptionsChainView
        model={makeModel({ pinnedExpirations: ["2026-07-11"] })}
        variant="sidebar"
      />,
    );

    expect(screen.getByTestId("options-exp-pin-2026-07-11")).toBeInTheDocument();
    expect(screen.getByTestId("options-exp-2026-07-11")).not.toHaveTextContent("pinned");
  });

  it("shows analyze actions in dialog popover when handler provided", async () => {
    const onAnalyzeContract = vi.fn();
    render(
      <OptionsChainView
        model={makeModel()}
        variant="dialog"
        onAnalyzeContract={onAnalyzeContract}
      />,
    );

    const row = screen.getByTestId("options-chain-row-150");
    const callBidCell = row.querySelectorAll("td")[0];
    fireEvent.mouseEnter(callBidCell!);

    await waitFor(() => {
      expect(screen.getByTestId("options-analyze-call-150")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("options-analyze-call-150"));
    expect(onAnalyzeContract).toHaveBeenCalledWith(
      expect.objectContaining({ type: "call", strike: 150 }),
    );
  });
});
