import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import WorkspaceLayoutPresetPicker from "./WorkspaceLayoutPresetPicker";
import { AppWorkspaceProvider, useAppWorkspace } from "./AppWorkspaceContext";
import { APP_WORKSPACES_STORAGE_KEY } from "@/lib/appWorkspace/storage";
import { resetAppWorkspaceIdCounterForTests } from "@/lib/appWorkspace/ids";

function TileCountProbe() {
  const { document } = useAppWorkspace();
  return <span data-testid="tile-count">{Object.keys(document.tiles).length}</span>;
}

describe("WorkspaceLayoutPresetPicker", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
    window.localStorage.removeItem(APP_WORKSPACES_STORAGE_KEY);
  });

  it("opens preset menu and applies two-cols layout", () => {
    render(
      <AppWorkspaceProvider>
        <TileCountProbe />
        <WorkspaceLayoutPresetPicker />
      </AppWorkspaceProvider>,
    );
    expect(screen.getByTestId("tile-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("workspace-layout-preset-trigger"));
    expect(screen.getByTestId("workspace-layout-preset-menu")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("workspace-layout-preset-two-cols"));
    expect(screen.getByTestId("tile-count")).toHaveTextContent("2");
    expect(screen.queryByTestId("workspace-layout-preset-menu")).not.toBeInTheDocument();
  });
});
