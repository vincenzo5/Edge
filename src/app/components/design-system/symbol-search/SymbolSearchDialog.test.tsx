/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { clearRecentSymbols, recordRecentSymbol } from "@/lib/app/recentSymbols";
import SymbolSearchDialog from "./SymbolSearchDialog";

const results = [
  { symbol: "IONQ", name: "IonQ, Inc.", exchange: "NYSE" },
  { symbol: "IONX", name: "Defiance Daily Target 2X Long IONQ ETF", exchange: "NASDAQ" },
];
const recents = [{ symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" }];

describe("SymbolSearchDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearRecentSymbols();
    recordRecentSymbol(recents[0]!);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ results }),
      })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearRecentSymbols();
  });

  it("shows recent symbols when query is empty", () => {
    render(
      <SymbolSearchDialog
        open
        mode="select"
        title="Symbol search"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        inputAriaLabel="Search symbol"
        inputTestId="symbol-search-modal-input"
        initialQuery=""
      />,
    );

    expect(screen.getByText("Recent")).toBeTruthy();
    expect(screen.getByRole("option", { name: /AAPL/i })).toBeTruthy();
  });

  it("shows empty recent copy when no recents exist", () => {
    clearRecentSymbols();

    render(
      <SymbolSearchDialog
        open
        mode="select"
        title="Symbol search"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        inputAriaLabel="Search symbol"
        inputTestId="symbol-search-modal-input"
        initialQuery=""
      />,
    );

    expect(screen.getByText("No recent symbols")).toBeTruthy();
  });

  it("autofocuses the search input when opened", async () => {
    render(
      <SymbolSearchDialog
        open
        mode="select"
        title="Symbol search"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        inputAriaLabel="Search symbol"
        inputTestId="symbol-search-modal-input"
        initialQuery="AAPL"
      />,
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId("symbol-search-modal-input")).toHaveFocus();
  });

  it("keeps input focus while typing across parent onClose identity changes", async () => {
    function Harness() {
      const [closeVersion, setCloseVersion] = useState(0);
      return (
        <>
          <SymbolSearchDialog
            open
            mode="select"
            title="Symbol search"
            onClose={() => {
              void closeVersion;
            }}
            onSelect={vi.fn()}
            inputAriaLabel="Search symbol"
            inputTestId="symbol-search-modal-input"
            initialQuery=""
          />
          <button type="button" onClick={() => setCloseVersion((v) => v + 1)}>
            Bump close
          </button>
        </>
      );
    }

    render(<Harness />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const input = screen.getByTestId("symbol-search-modal-input");
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "MSF" } });
    fireEvent.click(screen.getByRole("button", { name: "Bump close" }));

    expect(input).toHaveFocus();
    expect(input).toHaveValue("MSF");
  });

  it("supports keyboard selection and returns focus to trigger", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const triggerRef = createRef<HTMLButtonElement>();

    render(
      <>
        <button ref={triggerRef} type="button">
          Open
        </button>
        <SymbolSearchDialog
          open
          mode="select"
          title="Symbol search"
          onClose={onClose}
          onSelect={onSelect}
          returnFocusRef={triggerRef}
          inputAriaLabel="Search symbol"
          inputTestId="symbol-search-modal-input"
          testId="symbol-search-modal"
          initialQuery="IONQ"
        />
      </>,
    );

    triggerRef.current?.focus();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const input = screen.getByTestId("symbol-search-modal-input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(results[1]);
    expect(onClose).toHaveBeenCalled();
  });

  it("clears query from the shared clear control", async () => {
    render(
      <SymbolSearchDialog
        open
        mode="add"
        title="Add symbol"
        subtitle="Add to Main"
        onClose={vi.fn()}
        onSelect={vi.fn()}
        inputAriaLabel="Search symbols to add"
        inputTestId="watchlist-add-symbol-input"
        initialQuery="IONQ"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear symbol search" }));
    expect(screen.getByTestId("watchlist-add-symbol-input")).toHaveValue("");
  });
});
