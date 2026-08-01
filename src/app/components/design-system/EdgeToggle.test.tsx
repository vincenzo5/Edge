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

  it("renders off as recessed with the thumb inset on the left", () => {
    render(
      <EdgeToggleSwitch checked={false} onChange={vi.fn()} ariaLabel="Extended hours" />,
    );

    const toggle = screen.getByRole("switch");
    const track = toggle.querySelector<HTMLElement>('[data-slot="track"]');
    const thumb = toggle.querySelector<HTMLElement>('[data-slot="thumb"]');

    expect(track).toHaveAttribute("data-checked", "false");
    expect(track).toHaveAttribute("data-size", "standard");
    expect(track?.className).toContain("--edge-surface-active");
    expect(track?.className).toContain("--edge-border-strong");
    expect(track?.className).toContain("overflow-hidden");
    expect(track?.className).not.toContain("--edge-accent-blue-fill");
    expect(thumb?.className).toContain("left-0.5");
    expect(thumb?.className).toContain("--edge-text-secondary");
    expect(thumb?.className).not.toContain("left-[18px]");
  });

  it("renders on as accent-filled with the thumb inset on the right", () => {
    const { rerender } = render(
      <EdgeToggleSwitch checked onChange={vi.fn()} ariaLabel="Extended hours" />,
    );

    let toggle = screen.getByRole("switch");
    let track = toggle.querySelector<HTMLElement>('[data-slot="track"]');
    let thumb = toggle.querySelector<HTMLElement>('[data-slot="thumb"]');

    expect(track).toHaveAttribute("data-checked", "true");
    expect(track?.className).toContain("--edge-accent-blue-fill");
    expect(thumb?.className).toContain("left-[18px]");
    expect(thumb?.className).toContain("--edge-text-on-accent");

    // Compact geometry keeps the same 2px inset at both ends:
    // 28px track - 12px thumb - 2px right inset = 14px left.
    rerender(
      <EdgeToggleSwitch
        checked
        onChange={vi.fn()}
        ariaLabel="Extended hours"
        size="compact"
      />,
    );
    toggle = screen.getByRole("switch");
    track = toggle.querySelector<HTMLElement>('[data-slot="track"]');
    thumb = toggle.querySelector<HTMLElement>('[data-slot="thumb"]');

    expect(track).toHaveAttribute("data-size", "compact");
    expect(track?.className).toContain("h-4 w-7");
    expect(thumb?.className).toContain("h-3 w-3");
    expect(thumb?.className).toContain("left-3.5");
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
