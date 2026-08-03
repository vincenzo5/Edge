import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TradeSizeBudgetField } from "./TradeSizeBudgetField";

describe("TradeSizeBudgetField", () => {
  it("sizes qty when risk percent changes", () => {
    const onQuantityChange = vi.fn();
    const onRiskPercentChange = vi.fn();
    const onAbsoluteRiskChange = vi.fn();

    render(
      <TradeSizeBudgetField
        quantity={1}
        onQuantityChange={onQuantityChange}
        riskUnit="percent"
        onRiskUnitChange={vi.fn()}
        riskPercent={1}
        absoluteRisk={1000}
        onRiskPercentChange={onRiskPercentChange}
        onAbsoluteRiskChange={onAbsoluteRiskChange}
        entry={100}
        stop={95}
        accountBasisValue={100_000}
      />,
    );

    fireEvent.change(screen.getByTestId("trade-size-risk"), { target: { value: "10" } });

    expect(onRiskPercentChange).toHaveBeenCalledWith(10);
    expect(onQuantityChange).toHaveBeenCalledWith(2000);
  });

  it("preserves dollar budget when toggling percent to absolute", () => {
    const onRiskUnitChange = vi.fn();
    const onAbsoluteRiskChange = vi.fn();

    render(
      <TradeSizeBudgetField
        quantity={200}
        onQuantityChange={vi.fn()}
        riskUnit="percent"
        onRiskUnitChange={onRiskUnitChange}
        riskPercent={10}
        absoluteRisk={10_000}
        onRiskPercentChange={vi.fn()}
        onAbsoluteRiskChange={onAbsoluteRiskChange}
        entry={100}
        stop={95}
        accountBasisValue={100_000}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "$" }));

    expect(onRiskUnitChange).toHaveBeenCalledWith("absolute");
    expect(onAbsoluteRiskChange).toHaveBeenCalledWith(10_000);
  });

  it("updates risk readback when qty changes", () => {
    const onQuantityChange = vi.fn();
    const onRiskPercentChange = vi.fn();
    const onAbsoluteRiskChange = vi.fn();

    render(
      <TradeSizeBudgetField
        quantity={200}
        onQuantityChange={onQuantityChange}
        riskUnit="percent"
        onRiskUnitChange={vi.fn()}
        riskPercent={1}
        absoluteRisk={1000}
        onRiskPercentChange={onRiskPercentChange}
        onAbsoluteRiskChange={onAbsoluteRiskChange}
        entry={100}
        stop={95}
        accountBasisValue={100_000}
      />,
    );

    fireEvent.change(screen.getByTestId("trade-size-qty"), { target: { value: "400" } });

    expect(onQuantityChange).toHaveBeenCalledWith(400);
    expect(onRiskPercentChange).toHaveBeenCalledWith(2);
    expect(onAbsoluteRiskChange).toHaveBeenCalledWith(2000);
  });
});
