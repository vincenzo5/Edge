import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccountMarginSummary } from "./AccountMarginSummary";

describe("AccountMarginSummary", () => {
  it("renders utilization bar and plain status", () => {
    render(
      <AccountMarginSummary
        tags={{
          NetLiquidation: { tag: "NetLiquidation", value: "100000" },
          InitMarginReq: { tag: "InitMarginReq", value: "60000" },
          BuyingPower: { tag: "BuyingPower", value: "50000" },
          ExcessLiquidity: { tag: "ExcessLiquidity", value: "30000" },
          AvailableFunds: { tag: "AvailableFunds", value: "40000" },
          MaintMarginReq: { tag: "MaintMarginReq", value: "45000" },
        }}
      />,
    );

    expect(screen.getByTestId("account-margin-summary")).toBeInTheDocument();
    expect(screen.getByTestId("account-margin-util-bar")).toBeInTheDocument();
    expect(screen.getByTestId("account-margin-status")).toHaveTextContent("60% used · Getting tight");
  });

  it("reveals detail metrics when expanded", () => {
    render(
      <AccountMarginSummary
        tags={{
          NetLiquidation: { tag: "NetLiquidation", value: "100000" },
          InitMarginReq: { tag: "InitMarginReq", value: "60000" },
          BuyingPower: { tag: "BuyingPower", value: "50000" },
          ExcessLiquidity: { tag: "ExcessLiquidity", value: "30000" },
          AvailableFunds: { tag: "AvailableFunds", value: "40000" },
          MaintMarginReq: { tag: "MaintMarginReq", value: "45000" },
        }}
      />,
    );

    expect(screen.queryByTestId("account-margin-details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("account-margin-details-toggle"));
    expect(screen.getByTestId("account-margin-details")).toBeInTheDocument();
    expect(screen.getByText("0.60")).toBeInTheDocument();
  });
});
