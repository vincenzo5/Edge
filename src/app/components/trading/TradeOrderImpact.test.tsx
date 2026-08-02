/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TradeOrderImpact } from "./TradeOrderImpact";
import type { OrderImpactEconomics } from "@/lib/trading/computeOrderImpact";

const baseEconomics: OrderImpactEconomics = {
  notional: 2783.55,
  riskDollars: 33.55,
  rewardDollars: 66.45,
  riskRewardRatio: 1.98,
  riskMissingReason: null,
  rewardVisible: true,
  rrVisible: true,
};

describe("TradeOrderImpact", () => {
  it("renders notional, margin, risk, reward, and R:R", () => {
    render(
      <TradeOrderImpact
        economics={baseEconomics}
        initMarginChange={1391.78}
        availableAfter={8608.22}
        impactStatus="ok"
        marginEstimated={false}
        accountConnected
      />,
    );

    expect(screen.getByTestId("trade-order-impact")).toHaveTextContent("Review");
    expect(screen.getByTestId("trade-order-impact-notional")).toHaveTextContent("2,783.55");
    expect(screen.getByTestId("trade-order-impact-margin")).toHaveTextContent("1,391.78");
    expect(screen.getByTestId("trade-order-impact-affordability")).toHaveTextContent("Enough");
    expect(screen.getByTestId("trade-order-impact-risk")).toHaveTextContent("33.55");
    expect(screen.getByTestId("trade-order-impact-reward")).toHaveTextContent("66.45");
    expect(screen.getByTestId("trade-order-impact-rr")).toHaveTextContent("1:2.0");
    expect(screen.getByTestId("trade-order-impact-provenance")).toHaveTextContent("BROKER");
  });

  it("shows Needs stop and hides reward when unprotected", () => {
    render(
      <TradeOrderImpact
        economics={{
          notional: 500,
          riskDollars: null,
          rewardDollars: null,
          riskRewardRatio: null,
          riskMissingReason: "needs_stop",
          rewardVisible: false,
          rrVisible: false,
        }}
        initMarginChange={250}
        availableAfter={1000}
        impactStatus="ok"
        marginEstimated
        accountConnected
      />,
    );

    expect(screen.getByTestId("trade-order-impact-risk")).toHaveTextContent("Needs stop");
    expect(screen.queryByTestId("trade-order-impact-reward")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trade-order-impact-rr")).not.toBeInTheDocument();
    expect(screen.getByTestId("trade-order-impact-provenance")).toHaveTextContent("EST.");
  });

  it("renders Add stop action when onAddStop is provided", () => {
    const onAddStop = vi.fn();
    render(
      <TradeOrderImpact
        economics={{
          notional: 500,
          riskDollars: null,
          rewardDollars: null,
          riskRewardRatio: null,
          riskMissingReason: "needs_stop",
          rewardVisible: false,
          rrVisible: false,
        }}
        initMarginChange={250}
        availableAfter={1000}
        impactStatus="ok"
        marginEstimated
        accountConnected
        onAddStop={onAddStop}
      />,
    );

    fireEvent.click(screen.getByTestId("trade-order-impact-add-stop"));
    expect(onAddStop).toHaveBeenCalledTimes(1);
  });

  it("flags insufficient margin", () => {
    render(
      <TradeOrderImpact
        economics={baseEconomics}
        initMarginChange={50_000}
        availableAfter={-100}
        impactStatus="over"
        marginEstimated={false}
        accountConnected
      />,
    );
    expect(screen.getByTestId("trade-order-impact-affordability")).toHaveTextContent(
      "Insufficient margin",
    );
  });
});
