/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeSegmentedTabs from "./EdgeSegmentedTabs";

const segments = [
  { id: "dashboard", label: "Dashboard" },
  { id: "trades", label: "Trades" },
  { id: "settings", label: "Settings" },
];

describe("EdgeSegmentedTabs", () => {
  it("uses compact 32px tab targets", () => {
    render(<EdgeSegmentedTabs segments={segments} value="dashboard" onChange={vi.fn()} />);
    const tab = screen.getByRole("tab", { name: "Dashboard" });
    expect(tab.className).toContain("--edge-control-height-compact");
    expect(tab.className).toContain("edge-type-body");
  });

  it("moves selection with arrow keys", () => {
    const onChange = vi.fn();
    render(<EdgeSegmentedTabs segments={segments} value="dashboard" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("trades");
  });
});
