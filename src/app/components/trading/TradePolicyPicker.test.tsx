import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TradePolicyPicker } from "./TradePolicyPicker";

describe("TradePolicyPicker", () => {
  it("renders Off and user templates", () => {
    render(
      <TradePolicyPicker
        templates={[
          {
            id: "user_long",
            name: "Long half → BE → 0.5R trail",
            description: "Half at +1R",
            rules: [],
          },
        ]}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("trade-policy-picker")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Off" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Long half → BE → 0.5R trail" })).toBeTruthy();
  });

  it("calls onChange when selection changes", () => {
    const onChange = vi.fn();
    render(
      <TradePolicyPicker
        templates={[
          {
            id: "user_long",
            name: "Long half → BE → 0.5R trail",
            rules: [],
          },
        ]}
        value={null}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByTestId("trade-policy-picker"), {
      target: { value: "user_long" },
    });
    expect(onChange).toHaveBeenCalledWith("user_long");
  });
});
