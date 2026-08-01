import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildFixedStopLeg } from "@/lib/trading/bracketPlan";
import { summarizeSubmitRiskPlan } from "@/lib/risk/summarizeSubmitRiskPlan";
import { SubmitRiskPlanSummary } from "./SubmitRiskPlanSummary";

describe("SubmitRiskPlanSummary", () => {
  it("renders Budget / Size / Bracket / Manage rows", () => {
    const summary = summarizeSubmitRiskPlan({
      environment: "paper",
      quantity: 100,
      dollarRisk: 1000,
      plannedRiskDollars: 500,
      protectAttached: true,
      stopLeg: buildFixedStopLeg(95),
      takeProfitPrice: 110,
      managePresetId: "break_even",
    });

    render(<SubmitRiskPlanSummary summary={summary} manageSteps={["+1R → break-even stop"]} />);

    expect(screen.getByTestId("submit-risk-plan-summary")).toBeInTheDocument();
    expect(screen.getByTestId("submit-risk-plan-budget")).toHaveTextContent("$1,000");
    expect(screen.getByTestId("submit-risk-plan-size")).toHaveTextContent("100 sh");
    expect(screen.getByTestId("submit-risk-plan-protect")).toHaveTextContent("STP 95.00");
    expect(screen.getByTestId("submit-risk-plan-manage")).toHaveTextContent("Break-even");
    expect(screen.getByTestId("submit-risk-plan-failure-mode")).toHaveTextContent(
      "Broker stop stays live if Edge is down",
    );
    expect(screen.getByTestId("submit-risk-plan-gap-guidance")).toHaveTextContent(
      "Stop-market can fill through a gap",
    );
    expect(screen.getByTestId("submit-risk-plan-manage-steps")).toHaveTextContent(
      "+1R → break-even stop",
    );
  });

  it("shows live unprotected warning", () => {
    const summary = summarizeSubmitRiskPlan({
      environment: "live",
      quantity: 10,
      dollarRisk: 250,
      plannedRiskDollars: null,
      protectAttached: false,
      stopLeg: null,
      takeProfitPrice: null,
      managePresetId: "off",
    });

    render(<SubmitRiskPlanSummary summary={summary} />);

    expect(screen.getByTestId("submit-risk-plan-warnings")).toHaveTextContent(
      "without Bracket",
    );
    expect(screen.queryByTestId("submit-risk-plan-failure-mode")).not.toBeInTheDocument();
    expect(screen.queryByTestId("submit-risk-plan-gap-guidance")).not.toBeInTheDocument();
  });
});
