/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeUnderlineTabs from "./EdgeUnderlineTabs";

const segments = [
  { id: "dashboard", label: "Dashboard" },
  { id: "trades", label: "Trades" },
];

describe("EdgeUnderlineTabs", () => {
  it("uses compact 32px tab targets with underline active state", () => {
    render(<EdgeUnderlineTabs segments={segments} value="dashboard" onChange={vi.fn()} />);
    const tab = screen.getByRole("tab", { name: "Dashboard" });
    expect(tab.className).toContain("--edge-control-height-compact");
    expect(tab.className).toContain("border-[var(--edge-accent-blue)]");
    expect(tab.className).not.toContain("flex-1");
  });

  it("moves selection with arrow keys", () => {
    const onChange = vi.fn();
    render(<EdgeUnderlineTabs segments={segments} value="dashboard" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("trades");
  });

  it("stretches tabs evenly across full width when layout is stretch", () => {
    render(
      <EdgeUnderlineTabs
        segments={segments}
        value="dashboard"
        onChange={vi.fn()}
        layout="stretch"
        className="w-full"
      />,
    );
    expect(screen.getByRole("tablist").className).toContain("w-full");
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("flex-1");
    }
  });
});
