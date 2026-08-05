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
  it("renders hero notional, max size, capacity bar, after, and risk", () => {
    render(
      <TradeOrderImpact
        economics={baseEconomics}
        quantity={100}
        availableAfter={8608.22}
        impactStatus="ok"
        accountConnected
        maxAffordable={{ shares: 373, notional: 37300, estimated: false }}
      />,
    );

    expect(screen.getByTestId("trade-order-impact").className).not.toContain("--edge-surface-panel");
    expect(screen.getByTestId("trade-order-impact-notional")).toHaveTextContent("2,783.55");
    expect(screen.getByTestId("trade-order-impact-max-size")).toHaveTextContent("373 sh");
    expect(screen.getByTestId("trade-order-impact-max-size")).toHaveTextContent("37,300");
    expect(screen.getByTestId("trade-order-impact-capacity")).toHaveTextContent("100 / 373");
    expect(screen.getByTestId("trade-order-impact-available-after")).toHaveTextContent("8,608.22");
    expect(screen.getByTestId("trade-order-impact-affordability")).toHaveTextContent("✓");
    expect(screen.getByTestId("trade-order-impact-risk")).toHaveTextContent("33.55");
    expect(screen.queryByTestId("trade-order-impact-reward")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trade-order-impact-rr")).not.toBeInTheDocument();
  });

  it("shows Needs stop and no reward when unprotected", () => {
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
        quantity={10}
        availableAfter={1000}
        impactStatus="ok"
        accountConnected
        maxAffordable={{ shares: 50, notional: 2500, estimated: true }}
      />,
    );

    expect(screen.getByTestId("trade-order-impact-risk")).toHaveTextContent("Needs stop");
    expect(screen.queryByTestId("trade-order-impact-reward")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trade-order-impact-rr")).not.toBeInTheDocument();
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
        quantity={10}
        availableAfter={1000}
        impactStatus="ok"
        accountConnected
        onAddStop={onAddStop}
      />,
    );

    fireEvent.click(screen.getByTestId("trade-order-impact-add-stop"));
    expect(onAddStop).toHaveBeenCalledTimes(1);
  });

  it("flags over margin with OVER chip and clamps capacity bar label", () => {
    render(
      <TradeOrderImpact
        economics={baseEconomics}
        quantity={450}
        availableAfter={-100}
        impactStatus="over"
        accountConnected
        maxAffordable={{ shares: 373, notional: 37300, estimated: false }}
      />,
    );

    expect(screen.getByTestId("trade-order-impact-affordability")).toHaveTextContent("OVER");
    expect(screen.getByTestId("trade-order-impact-available-after")).toHaveTextContent("—");
    expect(screen.getByTestId("trade-order-impact-capacity")).toHaveTextContent("450 / 373");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("shows dash for max size and hides capacity bar when account disconnected", () => {
    render(
      <TradeOrderImpact
        economics={baseEconomics}
        quantity={100}
        availableAfter={8608.22}
        impactStatus="ok"
        accountConnected={false}
        maxAffordable={null}
      />,
    );

    expect(screen.getByTestId("trade-order-impact-max-size")).toHaveTextContent("—");
    expect(screen.queryByTestId("trade-order-impact-capacity")).not.toBeInTheDocument();
  });
});
