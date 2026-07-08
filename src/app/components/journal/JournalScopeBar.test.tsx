import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalScopeBar from "./JournalScopeBar";
import { EMPTY_JOURNAL_FILTERS } from "@/lib/journal/journalStats";

describe("JournalScopeBar", () => {
  it("calls onWindowChange when period preset changes", () => {
    const onWindowChange = vi.fn();
    render(
      <JournalScopeBar
        mode="dashboard"
        filters={EMPTY_JOURNAL_FILTERS}
        onChange={vi.fn()}
        window="30d"
        onWindowChange={onWindowChange}
      />,
    );

    fireEvent.change(screen.getByTestId("journal-period-select"), { target: { value: "7d" } });
    expect(onWindowChange).toHaveBeenCalledWith("7d");
  });

  it("updates symbol live with uppercase", () => {
    const onChange = vi.fn();
    render(
      <JournalScopeBar
        mode="dashboard"
        filters={EMPTY_JOURNAL_FILTERS}
        onChange={onChange}
        window="30d"
        onWindowChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("journal-filter-symbol"), { target: { value: "aapl" } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_JOURNAL_FILTERS, symbol: "AAPL" });
  });

  it("shows filter count on trigger button", () => {
    render(
      <JournalScopeBar
        mode="dashboard"
        filters={{ ...EMPTY_JOURNAL_FILTERS, setup: "breakout", outcome: "win" }}
        onChange={vi.fn()}
        window="30d"
        onWindowChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("journal-filter-drawer-trigger")).toHaveTextContent("Filters (2)");
  });

  it("clears filters and resets window from Clear all", () => {
    const onChange = vi.fn();
    const onWindowChange = vi.fn();
    render(
      <JournalScopeBar
        mode="dashboard"
        filters={{ ...EMPTY_JOURNAL_FILTERS, setup: "breakout", symbol: "AAPL" }}
        onChange={onChange}
        window="7d"
        onWindowChange={onWindowChange}
      />,
    );

    fireEvent.click(screen.getByTestId("journal-scope-clear-all"));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_JOURNAL_FILTERS });
    expect(onWindowChange).toHaveBeenCalledWith("all");
  });

  it("removes chip when chip button clicked", () => {
    const onChange = vi.fn();
    render(
      <JournalScopeBar
        mode="dashboard"
        filters={{ ...EMPTY_JOURNAL_FILTERS, setup: "breakout" }}
        onChange={onChange}
        window="30d"
        onWindowChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("journal-filter-chip-setup"));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_JOURNAL_FILTERS, setup: "all" });
  });

  it("opens drawer when custom period selected", () => {
    render(
      <JournalScopeBar
        mode="dashboard"
        filters={EMPTY_JOURNAL_FILTERS}
        onChange={vi.fn()}
        window="30d"
        onWindowChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("journal-period-select"), { target: { value: "custom" } });
    expect(screen.getByTestId("journal-filter-drawer-panel")).toBeInTheDocument();
  });

  it("omits status chip path in dashboard mode", () => {
    render(
      <JournalScopeBar
        mode="dashboard"
        filters={{ ...EMPTY_JOURNAL_FILTERS, status: "closed" }}
        onChange={vi.fn()}
        window="30d"
        onWindowChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-filter-drawer-trigger")).toHaveTextContent("Filters");
  });
});
