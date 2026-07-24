/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeToggle, { EdgeToggleSwitch } from "./EdgeToggle";

describe("EdgeToggleSwitch", () => {
  it("toggles via click and exposes switch semantics", () => {
    const onChange = vi.fn();
    render(
      <EdgeToggleSwitch
        checked={false}
        onChange={onChange}
        ariaLabel="Symbol sync"
        size="compact"
      />,
    );

    const toggle = screen.getByRole("switch", { name: "Symbol sync" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("respects disabled state", () => {
    const onChange = vi.fn();
    render(<EdgeToggleSwitch checked={true} disabled onChange={onChange} ariaLabel="Time" />);
    fireEvent.click(screen.getByRole("switch", { name: "Time" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("EdgeToggle", () => {
  it("renders label row with standard switch", () => {
    const onChange = vi.fn();
    render(<EdgeToggle label="Show volume" checked onChange={onChange} />);
    expect(screen.getByText("Show volume")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: "Show volume" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
