import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import JournalTradesTableControls from "./JournalTradesTableControls";
import { defaultJournalTradesTablePrefs } from "@/lib/journal/journalTradesTableControls";

describe("JournalTradesTableControls", () => {
  const defaults = defaultJournalTradesTablePrefs();

  function renderControls(
    overrides: Partial<Parameters<typeof JournalTradesTableControls>[0]> = {},
  ) {
    return render(
      <JournalTradesTableControls
        meta={{ total: 47 }}
        visibleColumns={defaults.visibleColumns}
        columnOrder={defaults.columnOrder}
        onVisibleColumnsChange={vi.fn()}
        onColumnOrderChange={vi.fn()}
        {...overrides}
      />,
    );
  }

  it("shows result count label", () => {
    renderControls();
    expect(screen.getByTestId("journal-trades-result-count")).toHaveTextContent("47 trades");
  });

  it("shows singular trade label", () => {
    renderControls({ meta: { total: 1 } });
    expect(screen.getByTestId("journal-trades-result-count")).toHaveTextContent("1 trade");
  });

  it("does not render pagination controls", () => {
    renderControls({ meta: { total: 120 } });
    expect(screen.queryByTestId("journal-trades-page-prev")).not.toBeInTheDocument();
    expect(screen.queryByTestId("journal-trades-page-size")).not.toBeInTheDocument();
  });

  it("does not render density segmented tabs", () => {
    renderControls();
    expect(screen.queryByTestId("journal-trades-density")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Comfortable" })).not.toBeInTheDocument();
  });

  it("calls onColumnOrderChange when a column is reordered", () => {
    const onColumnOrderChange = vi.fn();
    renderControls({ onColumnOrderChange });
    fireEvent.click(screen.getByTestId("journal-trades-columns-trigger"));
    const setupRow = screen.getByTestId("journal-trades-column-setup").closest("[draggable='true']");
    expect(setupRow).not.toBeNull();
    fireEvent.dragStart(setupRow!, { dataTransfer: { effectAllowed: "move", setData: vi.fn() } });
    const symbolRow = screen.getByTestId("journal-trades-column-symbol").closest("[draggable='true']");
    fireEvent.dragOver(symbolRow!, { preventDefault: vi.fn(), dataTransfer: { dropEffect: "move" } });
    fireEvent.drop(symbolRow!, { preventDefault: vi.fn() });
    expect(onColumnOrderChange).toHaveBeenCalled();
  });
});
