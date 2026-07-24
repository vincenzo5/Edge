import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskMarginCard } from "./RiskMarginCard";

const baseProps = {
  shares: 200,
  atRisk: 1000,
  cost: 20000,
  sizeError: null,
  sizeHint: null,
  accountConnected: true,
  current: {
    netLiquidation: 100000,
    initMarginReq: 62000,
    maintMarginReq: 50000,
    availableFunds: 41000,
    excessLiquidity: 38000,
    utilization: 0.62,
  },
  impact: {
    initMarginChange: 4200,
    maintMarginChange: 3500,
    projectedUtilization: 0.662,
    headroomAfter: 34500,
    warningText: null,
    estimated: false,
  },
  impactStatus: "ok" as const,
  currentStatus: "ok" as const,
  loading: false,
  error: null,
  showImpact: true,
  holdToStop: {
    liquidationPrice: 14.82,
    verdict: "stop_reachable" as const,
    distanceFromStop: 7.02,
    liqRelativeToStop: "below" as const,
    maintRatio: 0.25,
    estimated: false,
  },
  showLiquidationLine: true,
  onShowLiquidationLineChange: () => {},
};

describe("RiskMarginCard", () => {
  it("shows inline margin spinner while recalculating without Estimating copy", () => {
    render(<RiskMarginCard {...baseProps} loading />);

    expect(screen.getByTestId("risk-margin-loading")).toBeInTheDocument();
    expect(screen.queryByText("Estimating…")).not.toBeInTheDocument();
    expect(screen.getByTestId("risk-margin-util-label")).toHaveTextContent("62% now → 66% after");
    expect(screen.getByTestId("risk-margin-summary")).toHaveTextContent("$34,500 left");
  });

  it("blends liquidation into margin section with chart toggle", () => {
    render(<RiskMarginCard {...baseProps} />);

    expect(screen.getByTestId("risk-hold-to-stop")).toBeInTheDocument();
    expect(screen.getByTestId("risk-hold-verdict")).toHaveTextContent("Liq 14.82 · Stop reachable");
    expect(screen.queryByText(/Entry/)).not.toBeInTheDocument();
    expect(screen.getByTestId("risk-hold-show-on-chart")).toBeInTheDocument();
  });

  it("shows margin-call-first liquidation copy", () => {
    render(
      <RiskMarginCard
        {...baseProps}
        holdToStop={{
          ...baseProps.holdToStop!,
          liquidationPrice: 22.76,
          verdict: "margin_call_first",
          distanceFromStop: 0.92,
          liqRelativeToStop: "above",
        }}
      />,
    );

    expect(screen.getByTestId("risk-hold-verdict")).toHaveTextContent(
      "Liq 22.76 · Margin call first",
    );
  });
});
