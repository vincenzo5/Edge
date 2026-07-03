/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OptionsRiskCalculator } from "./OptionsRiskCalculator";
import type { OptionsChainModel } from "./useOptionsChainModel";
import type { StrikeRow } from "@/lib/options/optionsClient";

function contract(
  type: "call" | "put",
  strike: number,
  ask: number,
  iv = 0.35,
): StrikeRow {
  const snapshot = {
    contractSymbol: `${type}${strike}`,
    underlying: "AAPL",
    type,
    expiration: "2026-07-11",
    strike,
    bid: ask - 0.2,
    ask,
    mark: ask - 0.1,
    volume: 500,
    impliedVolatility: iv,
    delta: type === "call" ? 0.45 : -0.45,
    updatedAt: Date.now(),
  };
  return {
    strike,
    call: type === "call" ? snapshot : undefined,
    put: type === "put" ? snapshot : undefined,
  };
}

function makeModel(overrides?: Partial<OptionsChainModel>): OptionsChainModel {
  const rows: StrikeRow[] = [
    contract("call", 100, 4.2),
    contract("call", 105, 2.3),
    contract("call", 110, 1.1),
  ];

  return {
    snapshot: null,
    symbol: "AAPL",
    spotPrice: 100,
    expirations: ["2026-07-06", "2026-07-11", "2026-07-20"],
    expMeta: undefined,
    expLoading: false,
    expError: null,
    primaryExpiration: "2026-07-11",
    chainMeta: { source: "massive", stale: true },
    chainLoading: false,
    chainError: null,
    contracts: rows,
    chainContracts: rows.flatMap((row) => [row.call, row.put].filter(Boolean)) as NonNullable<
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
    isExpirationPinned: vi.fn(() => false),
    ...overrides,
  };
}

describe("OptionsRiskCalculator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
  });

  it("prefills max risk from dollarRisk when set", () => {
    render(
      <OptionsRiskCalculator model={makeModel()} dollarRisk={1000} basisStale={false} />,
    );
    expect(screen.getByTestId("options-calc-max-risk")).toHaveValue(1000);
  });

  it("shows hint when dollarRisk is unavailable", () => {
    render(
      <OptionsRiskCalculator model={makeModel()} dollarRisk={null} basisStale={false} />,
    );
    expect(screen.getByText(/Set risk in the Risk sidebar panel/i)).toBeInTheDocument();
  });

  it("shows stale hint when basis is stale", () => {
    render(
      <OptionsRiskCalculator model={makeModel()} dollarRisk={1000} basisStale={true} />,
    );
    expect(screen.getByTestId("options-calc-stale-hint")).toBeInTheDocument();
  });

  it("seeds a leg from chain analyze handoff", () => {
    const call = contract("call", 105, 2.3).call!;
    render(
      <OptionsRiskCalculator
        model={makeModel()}
        dollarRisk={5000}
        basisStale={false}
        seedLeg={{ contract: call, action: "buy", quantity: 1 }}
        onSeedConsumed={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/2026-07-11/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("options-calc-payoff-grid")).toBeInTheDocument();
  });

  it("renders payoff grid after adding a leg with nearest chain strike", () => {
    const rows: StrikeRow[] = [
      contract("call", 100, 4.2),
      contract("call", 105, 2.3),
      contract("call", 110, 1.1),
    ];
    render(
      <OptionsRiskCalculator
        model={makeModel({
          spotPrice: 103,
          chainContracts: rows.flatMap((row) => [row.call, row.put].filter(Boolean)) as NonNullable<
            StrikeRow["call"]
          >[],
          contracts: rows,
        })}
        dollarRisk={5000}
        basisStale={false}
      />,
    );

    fireEvent.click(screen.getByTestId("options-calc-add-leg"));
    expect(screen.getByTestId("options-calc-payoff-grid")).toBeInTheDocument();
    expect(screen.getByTestId("options-calc-summary")).toBeInTheDocument();
    const strikeSelect = screen.getByTestId(/^options-calc-strike-/);
    expect(strikeSelect).toHaveValue("105");
  });

  it("shows auto contracts badge when max risk sizes a seeded leg", () => {
    render(
      <OptionsRiskCalculator
        model={makeModel()}
        dollarRisk={5000}
        basisStale={false}
        seedLeg={{ contract: contract("call", 105, 2.3).call!, action: "buy", quantity: 1 }}
        onSeedConsumed={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("options-calc-max-risk"), {
      target: { value: "4000" },
    });
    expect(screen.getByTestId("options-calc-auto-contracts")).toHaveTextContent(/Auto:/);
  });

  it("disables add leg while chain is loading", () => {
    render(
      <OptionsRiskCalculator
        model={makeModel({ chainLoading: true, chainContracts: [] })}
        dollarRisk={1000}
        basisStale={false}
      />,
    );

    expect(screen.getByTestId("options-calc-add-leg")).toBeDisabled();
    expect(screen.getByTestId("options-calc-chain-loading")).toBeInTheDocument();
  });

  it("shows empty chain message when chain is not loaded", () => {
    render(
      <OptionsRiskCalculator
        model={makeModel({ chainContracts: [] })}
        dollarRisk={1000}
        basisStale={false}
      />,
    );

    expect(screen.getByTestId("options-calc-add-leg")).toBeDisabled();
    expect(screen.getByTestId("options-calc-chain-empty")).toBeInTheDocument();
  });

  it("lists chain strikes in leg strike select", () => {
    render(
      <OptionsRiskCalculator
        model={makeModel()}
        dollarRisk={5000}
        basisStale={false}
        seedLeg={{ contract: contract("call", 105, 2.3).call!, action: "buy", quantity: 1 }}
        onSeedConsumed={vi.fn()}
      />,
    );

    const strikeSelect = screen.getByTestId(/^options-calc-strike-/);
    expect(strikeSelect.querySelectorAll("option")).toHaveLength(3);
    expect(screen.getByTestId("options-calc-payoff-grid")).toBeInTheDocument();
  });

  it("shows validation error when entry price is unavailable", () => {
    const row = contract("call", 105, 2.3);
    const badCall = {
      ...row.call!,
      bid: null,
      ask: null,
      mark: null,
      last: null,
    };
    render(
      <OptionsRiskCalculator
        model={makeModel({
          chainContracts: [badCall],
          contracts: [{ strike: 105, call: badCall }],
        })}
        dollarRisk={5000}
        basisStale={false}
        seedLeg={{ contract: badCall, action: "buy", quantity: 1 }}
        onSeedConsumed={vi.fn()}
      />,
    );

    expect(screen.getByText(/Missing entry price/i)).toBeInTheDocument();
  });

  it("draws risk ruler from evaluated strategy", () => {
    const model = makeModel();
    render(
      <OptionsRiskCalculator
        model={model}
        dollarRisk={5000}
        basisStale={false}
        seedLeg={{ contract: contract("call", 105, 2.3).call!, action: "buy", quantity: 1 }}
        onSeedConsumed={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("options-calc-draw-ruler"));
    expect(model.addRiskRulerFromCalc).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "bullish",
        spotPrice: 100,
        strike: 105,
        expiration: "2026-07-11",
      }),
    );
  });

  it("shows stale source badge", () => {
    render(
      <OptionsRiskCalculator model={makeModel()} dollarRisk={1000} basisStale={false} />,
    );
    expect(screen.getByTestId("options-calc-source-badge")).toHaveTextContent(/stale/i);
  });

  it("updates scenario detail when a payoff cell is clicked", () => {
    render(
      <OptionsRiskCalculator
        model={makeModel()}
        dollarRisk={5000}
        basisStale={false}
        seedLeg={{ contract: contract("call", 105, 2.3).call!, action: "buy", quantity: 1 }}
        onSeedConsumed={vi.fn()}
      />,
    );

    const cell = screen.getByTestId("options-calc-payoff-row-105")?.querySelector("td:nth-child(2)");
    if (cell) fireEvent.click(cell);
    expect(screen.getByTestId("options-calc-scenario-detail")).not.toHaveTextContent(
      /Click a payoff cell/i,
    );
  });
});
