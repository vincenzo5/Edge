import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import JournalTradesTableControls from "./JournalTradesTableControls";
import { defaultJournalTradesTablePrefs } from "@/lib/journal/journalTradesTableControls";

describe("JournalTradesTableControls", () => {
  const defaults = defaultJournalTradesTablePrefs();

  it("shows result count label", () => {
    render(
      <JournalTradesTableControls
        meta={{ total: 47, page: 1, pageSize: 25, pageCount: 2, from: 1, to: 25 }}
        visibleColumns={defaults.visibleColumns}
        density="compact"
        onVisibleColumnsChange={vi.fn()}
        onDensityChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-trades-result-count")).toHaveTextContent(
      "Showing 1–25 of 47 trades",
    );
  });

  it("shows pagination when total exceeds page size", () => {
    render(
      <JournalTradesTableControls
        meta={{ total: 60, page: 2, pageSize: 25, pageCount: 3, from: 26, to: 50 }}
        visibleColumns={defaults.visibleColumns}
        density="compact"
        onVisibleColumnsChange={vi.fn()}
        onDensityChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journal-trades-page-prev")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trades-page-indicator")).toHaveTextContent("2 / 3");
  });

  it("hides pagination when all rows fit one page", () => {
    render(
      <JournalTradesTableControls
        meta={{ total: 12, page: 1, pageSize: 50, pageCount: 1, from: 1, to: 12 }}
        visibleColumns={defaults.visibleColumns}
        density="compact"
        onVisibleColumnsChange={vi.fn()}
        onDensityChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("journal-trades-page-prev")).not.toBeInTheDocument();
  });

  it("calls onPageChange when next is clicked", () => {
    const onPageChange = vi.fn();
    render(
      <JournalTradesTableControls
        meta={{ total: 60, page: 1, pageSize: 25, pageCount: 3, from: 1, to: 25 }}
        visibleColumns={defaults.visibleColumns}
        density="compact"
        onVisibleColumnsChange={vi.fn()}
        onDensityChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click(screen.getByTestId("journal-trades-page-next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onDensityChange from segmented tabs", () => {
    const onDensityChange = vi.fn();
    render(
      <JournalTradesTableControls
        meta={{ total: 5, page: 1, pageSize: 50, pageCount: 1, from: 1, to: 5 }}
        visibleColumns={defaults.visibleColumns}
        density="compact"
        onVisibleColumnsChange={vi.fn()}
        onDensityChange={onDensityChange}
        onPageSizeChange={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Comfortable" }));
    expect(onDensityChange).toHaveBeenCalledWith("comfortable");
  });
});
