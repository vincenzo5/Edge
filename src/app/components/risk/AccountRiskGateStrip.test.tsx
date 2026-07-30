import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountRiskGateStrip } from "./AccountRiskGateStrip";
import { evaluateAccountRiskGates } from "@/lib/risk/accountRiskGates";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";

describe("AccountRiskGateStrip", () => {
  it("renders day loss and open heat lines when caps enabled", () => {
    const status = evaluateAccountRiskGates({
      settings: {
        ...DEFAULT_RISK_SETTINGS,
        periodLossCapPercent: 3,
        openHeatCapPercent: 6,
      },
      netLiquidation: 100_000,
      dailyPnL: -1_500,
      openHeatDollars: 4_000,
      openPositionCount: 2,
      trackedPlanCount: 1,
    });

    render(<AccountRiskGateStrip status={status} />);

    expect(screen.getByTestId("account-risk-gate-day-loss")).toHaveTextContent("Day P&L");
    expect(screen.getByTestId("account-risk-gate-open-heat")).toHaveTextContent("Open heat");
    expect(screen.getByTestId("account-risk-gate-open-heat")).toHaveTextContent("untracked");
  });

  it("renders nothing when caps disabled", () => {
    const status = evaluateAccountRiskGates({
      settings: DEFAULT_RISK_SETTINGS,
      netLiquidation: 100_000,
      dailyPnL: -500,
      openHeatDollars: 1_000,
    });

    const { container } = render(<AccountRiskGateStrip status={status} />);
    expect(container).toBeEmptyDOMElement();
  });
});
