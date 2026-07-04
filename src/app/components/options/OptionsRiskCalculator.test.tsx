/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState, useCallback, type ComponentProps } from "react";
import { OptionsRiskCalculator } from "./OptionsRiskCalculator";
import type { OptionsChainModel } from "./useOptionsChainModel";
import type { StrikeRow } from "@/lib/options/optionsClient";
import {
  DEFAULT_OPTIONS_CALCULATOR,
  type OptionsCalculatorState,
} from "@/lib/options/optionsSession";
import type { StrategyLegInput } from "@/lib/risk/optionsStrategyRisk";

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

function CalculatorHarness(
  props: Omit<
    ComponentProps<typeof OptionsRiskCalculator>,
    "calculator" | "patchCalculator" | "setLegs"
  > & { initialCalculator?: Partial<OptionsCalculatorState> },
) {
  const { initialCalculator, ...rest } = props;
  const [calculator, setCalculator] = useState<OptionsCalculatorState>(() => ({
    ...DEFAULT_OPTIONS_CALCULATOR,
    ...initialCalculator,
  }));

  const patchCalculator = useCallback((patch: Partial<OptionsCalculatorState>) => {
    setCalculator((current) => ({ ...current, ...patch }));
  }, []);

  const setLegs = useCallback((updater: (prev: StrategyLegInput[]) => StrategyLegInput[]) => {
    setCalculator((current) => ({ ...current, legs: updater(current.legs) }));
  }, []);

  return (
    <OptionsRiskCalculator
      {...rest}
      calculator={calculator}
      patchCalculator={patchCalculator}
      setLegs={setLegs}
    />
  );
}

describe("OptionsRiskCalculator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
  });

  it("prefills max risk from dollarRisk when set", () => {
    render(
      <CalculatorHarness model={makeModel()} dollarRisk={1000} basisStale={false} />,
    );
    expect(screen.getByTestId("options-calc-max-risk")).toHaveValue(1000);
  });

  it("fills max risk when dollarRisk arrives after mount", () => {
    const { rerender } = render(
      <CalculatorHarness model={makeModel()} dollarRisk={null} basisStale={false} />,
    );

    expect(screen.getByTestId("options-calc-max-risk")).toHaveValue(null);

    rerender(
      <CalculatorHarness model={makeModel()} dollarRisk={1000} basisStale={false} />,
    );
    expect(screen.getByTestId("options-calc-max-risk")).toHaveValue(1000);
  });

  it("updates max risk when dollarRisk changes before user edits", () => {
    const { rerender } = render(
      <CalculatorHarness model={makeModel()} dollarRisk={1000} basisStale={false} />,
    );

    rerender(
      <CalculatorHarness model={makeModel()} dollarRisk={2000} basisStale={false} />,
    );
    expect(screen.getByTestId("options-calc-max-risk")).toHaveValue(2000);
  });

  it("does not overwrite max risk after the user edits it", () => {
    const { rerender } = render(
      <CalculatorHarness model={makeModel()} dollarRisk={1000} basisStale={false} />,
    );

    fireEvent.change(screen.getByTestId("options-calc-max-risk"), {
      target: { value: "750" },
    });

    rerender(
      <CalculatorHarness model={makeModel()} dollarRisk={2000} basisStale={false} />,
    );
    expect(screen.getByTestId("options-calc-max-risk")).toHaveValue(750);
  });

  it("shows hint when dollarRisk is unavailable", () => {
    render(
      <CalculatorHarness model={makeModel()} dollarRisk={null} basisStale={false} />,
    );
    expect(screen.getByText(/Set risk in the Risk sidebar panel/i)).toBeInTheDocument();
  });

  it("shows stale hint when basis is stale", () => {
    render(
      <CalculatorHarness model={makeModel()} dollarRisk={1000} basisStale={true} />,
    );
    expect(screen.getByTestId("options-calc-stale-hint")).toBeInTheDocument();
  });

  it("seeds a leg from chain analyze handoff", () => {
    const call = contract("call", 105, 2.3).call!;
    render(
      <CalculatorHarness
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
      <CalculatorHarness
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
      <CalculatorHarness
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
      <CalculatorHarness
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
      <CalculatorHarness
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
      <CalculatorHarness
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
      <CalculatorHarness
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
      <CalculatorHarness
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
      <CalculatorHarness model={makeModel()} dollarRisk={1000} basisStale={false} />,
    );
    expect(screen.getByTestId("options-calc-source-badge")).toHaveTextContent(/stale/i);
  });

  it("updates scenario detail when a payoff cell is clicked", () => {
    render(
      <CalculatorHarness
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
