/** @vitest-environment jsdom */
import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FloatingPanelHost from "./FloatingPanelHost";
import { PRESENCE_EXIT_MS } from "../design-system/usePresence";
import { PanelPresentationProvider } from "./PanelPresentationContext";
import { ScreenerProvider } from "../screener/ScreenerProvider";
import { ChartActionsProvider } from "../ChartActionsContext";
import { WatchlistProvider } from "../watchlist/WatchlistContext";

describe("FloatingPanelHost", () => {
  it("renders floating watchlist panel when presentation is floating", () => {
    const onClose = vi.fn();
    const onDock = vi.fn();

    render(
      <WatchlistProvider>
        <ChartActionsProvider activeCellSymbol="AAPL" loadSymbolIntoActiveChart={vi.fn()}>
          <PanelPresentationProvider
            value={{
              presentation: "floating",
              popOut: vi.fn(),
              dock: onDock,
              canPopOut: false,
              canDock: true,
            }}
          >
            <div className="relative h-[800px] w-[1200px]">
              <FloatingPanelHost
                activePanel="watchlist"
                sidebar={{
                  activePanel: "watchlist",
                  presentation: { watchlist: "floating" },
                  floatingGeometry: {
                    watchlist: { x: 48, y: 48, width: 480, height: 400 },
                  },
                }}
                onGeometryChange={vi.fn()}
                onDock={onDock}
                onClose={onClose}
              />
            </div>
          </PanelPresentationProvider>
        </ChartActionsProvider>
      </WatchlistProvider>,
    );

    expect(screen.getByTestId("floating-panel-watchlist")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("floating-panel-watchlist-dock"));
    expect(onDock).toHaveBeenCalledWith("watchlist");
  });

  it("renders nothing when presentation is docked", () => {
    const { container } = render(
      <FloatingPanelHost
        activePanel="watchlist"
        sidebar={{ activePanel: "watchlist", presentation: { watchlist: "docked" } }}
        onGeometryChange={vi.fn()}
        onDock={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders floating screener panel", () => {
    render(
      <WatchlistProvider>
        <ScreenerProvider>
          <ChartActionsProvider activeCellSymbol="AAPL" loadSymbolIntoActiveChart={vi.fn()}>
            <div className="relative h-[800px] w-[1200px]">
              <FloatingPanelHost
                activePanel="screener"
                sidebar={{
                  activePanel: "screener",
                  presentation: { screener: "floating" },
                }}
                onGeometryChange={vi.fn()}
                onDock={vi.fn()}
                onClose={vi.fn()}
              />
            </div>
          </ChartActionsProvider>
        </ScreenerProvider>
      </WatchlistProvider>,
    );

    expect(screen.getByTestId("floating-panel-screener")).toBeInTheDocument();
  });

  it("stays mounted through exit animation before unmounting", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    const { rerender } = render(
      <WatchlistProvider>
        <ChartActionsProvider activeCellSymbol="AAPL" loadSymbolIntoActiveChart={vi.fn()}>
          <div className="relative h-[800px] w-[1200px]">
            <FloatingPanelHost
              activePanel="watchlist"
              sidebar={{
                activePanel: "watchlist",
                presentation: { watchlist: "floating" },
                floatingGeometry: {
                  watchlist: { x: 48, y: 48, width: 480, height: 400 },
                },
              }}
              onGeometryChange={vi.fn()}
              onDock={vi.fn()}
              onClose={vi.fn()}
            />
          </div>
        </ChartActionsProvider>
      </WatchlistProvider>,
    );

    expect(screen.getByTestId("floating-panel-watchlist")).toBeInTheDocument();

    rerender(
      <WatchlistProvider>
        <ChartActionsProvider activeCellSymbol="AAPL" loadSymbolIntoActiveChart={vi.fn()}>
          <div className="relative h-[800px] w-[1200px]">
            <FloatingPanelHost
              activePanel={null}
              sidebar={{ activePanel: null }}
              onGeometryChange={vi.fn()}
              onDock={vi.fn()}
              onClose={vi.fn()}
            />
          </div>
        </ChartActionsProvider>
      </WatchlistProvider>,
    );

    expect(screen.getByTestId("floating-panel-watchlist")).toHaveAttribute(
      "data-floating-visible",
      "false",
    );

    act(() => {
      vi.advanceTimersByTime(PRESENCE_EXIT_MS);
    });
    expect(screen.queryByTestId("floating-panel-watchlist")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
