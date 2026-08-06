import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AppWorkspaceProvider, useAppWorkspace } from "./AppWorkspaceContext";
import WorkspacePanelContextMenu from "./WorkspacePanelContextMenu";

function TileProbe() {
  const { document } = useAppWorkspace();
  const tileId = Object.keys(document.tiles)[0] ?? "missing";
  const surfaceId = document.tiles[tileId]?.surfaceId ?? "chart";
  return (
    <div data-workspace-tile-id={tileId} data-surface={surfaceId}>
      Chart tile
    </div>
  );
}

function renderMenu() {
  return render(
    <AppWorkspaceProvider>
      <WorkspacePanelContextMenu />
      <TileProbe />
      <div>Outside tile</div>
    </AppWorkspaceProvider>,
  );
}

describe("WorkspacePanelContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens Change panel on control right-click over a workspace tile", () => {
    renderMenu();
    fireEvent.contextMenu(screen.getByText("Chart tile"), {
      ctrlKey: true,
      button: 2,
    });
    expect(screen.getByRole("menu", { name: "Change panel" })).toBeInTheDocument();
    expect(screen.getByText("Change panel")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Screener" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Journal" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copilot" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Expectancy" })).toBeInTheDocument();
  });

  it("does not open on plain right-click over a tile", () => {
    renderMenu();
    fireEvent.contextMenu(screen.getByText("Chart tile"), { button: 2 });
    expect(screen.queryByRole("menu", { name: "Change panel" })).not.toBeInTheDocument();
  });

  it("does not open on control right-click outside a tile", () => {
    renderMenu();
    fireEvent.contextMenu(screen.getByText("Outside tile"), {
      ctrlKey: true,
      button: 2,
    });
    expect(screen.queryByRole("menu", { name: "Change panel" })).not.toBeInTheDocument();
  });

  it("does not include app chrome items", () => {
    renderMenu();
    fireEvent.contextMenu(screen.getByText("Chart tile"), {
      ctrlKey: true,
      button: 2,
    });
    expect(screen.queryByRole("menuitem", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Market data" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Order account" })).not.toBeInTheDocument();
  });
});
