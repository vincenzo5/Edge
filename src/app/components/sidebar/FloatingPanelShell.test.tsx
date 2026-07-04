import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FloatingPanelShell from "./FloatingPanelShell";

describe("FloatingPanelShell", () => {
  it("renders title, dock, close, and children", () => {
    const onDock = vi.fn();
    const onClose = vi.fn();
    const onGeometryChange = vi.fn();

    render(
      <div className="relative h-[800px] w-[1200px]">
        <FloatingPanelShell
          panelId="watchlist"
          title="Watchlist"
          geometry={{ x: 48, y: 48, width: 480, height: 400 }}
          onGeometryChange={onGeometryChange}
          onDock={onDock}
          onClose={onClose}
        >
          <div data-testid="panel-body">Body</div>
        </FloatingPanelShell>
      </div>,
    );

    expect(screen.getByText("Watchlist")).toBeInTheDocument();
    expect(screen.getByTestId("panel-body")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("floating-panel-watchlist-dock"));
    expect(onDock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("floating-panel-watchlist-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
