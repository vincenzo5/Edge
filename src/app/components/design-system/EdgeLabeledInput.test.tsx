/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeLabeledInput from "./EdgeLabeledInput";

describe("EdgeLabeledInput", () => {
  it("renders border-legend label matching EdgeSelect field style", () => {
    render(
      <EdgeLabeledInput
        label="Quantity"
        value="1"
        onChange={vi.fn()}
        testId="qty-input"
      />,
    );

    const label = screen.getByText("Quantity");
    expect(label.className).toContain("-translate-y-1/2");
    expect(label.className).toContain("--edge-surface-panel");

    const input = screen.getByTestId("qty-input");
    expect(input).toHaveAttribute("aria-labelledby", label.id);
    expect(input).toHaveValue("1");
  });

  it("forwards change events", () => {
    const onChange = vi.fn();
    render(<EdgeLabeledInput label="Quantity" value="1" onChange={onChange} testId="qty-input" />);

    fireEvent.change(screen.getByTestId("qty-input"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalled();
  });
});
