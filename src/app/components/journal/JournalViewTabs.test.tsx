/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalViewTabs from "./JournalViewTabs";
import { JournalTileViewProvider } from "@/app/components/app-workspace/JournalTileViewContext";

describe("JournalViewTabs", () => {
  it("renders underline tabs when tile view context is dashboard, trades, or open", () => {
    const setView = vi.fn();
    render(
      <JournalTileViewProvider view="dashboard" listView="dashboard" setView={setView}>
        <JournalViewTabs />
      </JournalTileViewProvider>,
    );

    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Trades" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Open Positions" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls setView when a tab is clicked", () => {
    const setView = vi.fn();
    render(
      <JournalTileViewProvider view="dashboard" listView="dashboard" setView={setView}>
        <JournalViewTabs />
      </JournalTileViewProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Trades" }));
    expect(setView).toHaveBeenCalledWith("trades");

    fireEvent.click(screen.getByRole("tab", { name: "Open Positions" }));
    expect(setView).toHaveBeenCalledWith("open");
  });

  it("renders nothing without tile view context", () => {
    render(<JournalViewTabs />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("keeps prior list tab selected while settings is open", () => {
    const setView = vi.fn();
    render(
      <JournalTileViewProvider view="settings" listView="trades" setView={setView}>
        <JournalViewTabs />
      </JournalTileViewProvider>,
    );

    expect(screen.getByRole("tab", { name: "Trades" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByRole("tab", { name: "Dashboard" }));
    expect(setView).toHaveBeenCalledWith("dashboard");
  });
});
