import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalFilterDrawer from "./JournalFilterDrawer";
import { EMPTY_JOURNAL_FILTERS } from "@/lib/journal/journalStats";

describe("JournalFilterDrawer", () => {
  it("renders panel when open", () => {
    render(
      <JournalFilterDrawer
        open
        mode="dashboard"
        filters={EMPTY_JOURNAL_FILTERS}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-filter-drawer-panel")).toBeInTheDocument();
  });

  it("does not commit draft until Apply", () => {
    const onApply = vi.fn();
    render(
      <JournalFilterDrawer
        open
        mode="dashboard"
        filters={EMPTY_JOURNAL_FILTERS}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByTestId("journal-filter-drawer-setup"), {
      target: { value: "breakout" },
    });
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("journal-filter-drawer-apply"));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_JOURNAL_FILTERS, setup: "breakout" });
  });

  it("closes without apply from backdrop", () => {
    const onClose = vi.fn();
    const onApply = vi.fn();
    render(
      <JournalFilterDrawer
        open
        mode="dashboard"
        filters={EMPTY_JOURNAL_FILTERS}
        onClose={onClose}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByTestId("journal-filter-drawer-setup"), {
      target: { value: "breakout" },
    });
    fireEvent.click(screen.getByTestId("journal-filter-drawer-backdrop"));
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("shows status field in trades mode only", () => {
    const { rerender } = render(
      <JournalFilterDrawer
        open
        mode="dashboard"
        filters={EMPTY_JOURNAL_FILTERS}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("journal-filter-drawer-status")).not.toBeInTheDocument();

    rerender(
      <JournalFilterDrawer
        open
        mode="trades"
        filters={EMPTY_JOURNAL_FILTERS}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-filter-drawer-status")).toBeInTheDocument();
  });

  it("clears draft fields from Clear button", () => {
    render(
      <JournalFilterDrawer
        open
        mode="dashboard"
        filters={{ ...EMPTY_JOURNAL_FILTERS, setup: "breakout", tag: "earnings" }}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("journal-filter-drawer-clear"));
    expect(screen.getByTestId("journal-filter-drawer-setup")).toHaveValue("all");
    expect(screen.getByTestId("journal-filter-drawer-tag")).toHaveValue("");
  });
});
