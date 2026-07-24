/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import ColumnPickerPopover from "./ColumnPickerPopover";

function ColumnPickerHarness({ reorderable = false }: { reorderable?: boolean }) {
  const anchorRef = createRef<HTMLButtonElement>();
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState(new Set(["symbol", "price"]));
  const [order, setOrder] = useState(["symbol", "price"]);

  return (
    <>
      <button ref={anchorRef} type="button" data-testid="anchor">
        Columns
      </button>
      <ColumnPickerPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        reorderable={reorderable}
        onReorder={(_sectionId, fromIndex, toIndex) => {
          setOrder((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            if (moved == null) return prev;
            next.splice(toIndex, 0, moved);
            return next;
          });
        }}
        sections={[
          {
            id: "columns",
            label: "Columns",
            items: order.map((id) => ({
              id,
              label: id === "symbol" ? "Symbol" : "Price",
              checked: checked.has(id),
              disabled: checked.has(id) && checked.size <= 1,
              testId: `column-${id}`,
            })),
          },
        ]}
        onToggle={(_sectionId, itemId) => {
          setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
              if (next.size > 1) next.delete(itemId);
            } else {
              next.add(itemId);
            }
            return next;
          });
        }}
        onReset={vi.fn()}
      />
    </>
  );
}

describe("ColumnPickerPopover", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("toggles checkbox columns and enforces minimum selection", () => {
    render(<ColumnPickerHarness />);
    const symbol = screen.getByTestId("column-symbol").querySelector("input") as HTMLInputElement;
    const price = screen.getByTestId("column-price").querySelector("input") as HTMLInputElement;

    expect(symbol.checked).toBe(true);
    fireEvent.click(symbol);
    expect(symbol.checked).toBe(false);

    fireEvent.click(symbol);
    expect(symbol.checked).toBe(true);

    fireEvent.click(price);
    expect(price.checked).toBe(false);
  });

  it("dismisses on Escape and returns focus to trigger", () => {
    render(<ColumnPickerHarness />);
    const anchor = screen.getByTestId("anchor");
    anchor.focus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("Symbol")).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });

  it("reorders rows when reorderable is enabled", () => {
    render(<ColumnPickerHarness reorderable />);
    const symbolRow = screen.getByTestId("column-symbol").closest("[draggable='true']");
    const priceRow = screen.getByTestId("column-price").closest("[draggable='true']");
    expect(symbolRow).not.toBeNull();
    expect(priceRow).not.toBeNull();

    fireEvent.dragStart(symbolRow!, { dataTransfer: { effectAllowed: "move", setData: vi.fn() } });
    fireEvent.dragOver(priceRow!, { preventDefault: vi.fn(), dataTransfer: { dropEffect: "move" } });
    fireEvent.drop(priceRow!, { preventDefault: vi.fn() });

    const labels = screen.getAllByRole("checkbox").map((input) => input.getAttribute("aria-label"));
    expect(labels).toEqual(["Price", "Symbol"]);
  });
});
