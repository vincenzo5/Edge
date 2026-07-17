import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import WorkspacePill from "./WorkspacePill";
import { AppWorkspaceProvider } from "./AppWorkspaceContext";
import { APP_WORKSPACES_STORAGE_KEY } from "@/lib/appWorkspace/storage";
import { resetAppWorkspaceIdCounterForTests } from "@/lib/appWorkspace/ids";
import { createDefaultWorkspacesState, duplicateDocument } from "@/lib/appWorkspace/commands";

describe("WorkspacePill", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
    window.localStorage.removeItem(APP_WORKSPACES_STORAGE_KEY);
  });

  it("shows active workspace name on trigger", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspacePill />
      </AppWorkspaceProvider>,
    );
    expect(screen.getByTestId("workspace-pill")).toHaveTextContent("Default");
  });

  it("opens menu with workspace list and actions", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspacePill />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("workspace-pill"));
    expect(screen.getByTestId("workspace-pill-menu")).toBeInTheDocument();
    expect(screen.getByText("Rename…")).toBeInTheDocument();
    expect(screen.getByText("New workspace")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
  });

  it("does not show always-on rename input in use chrome", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspacePill />
      </AppWorkspaceProvider>,
    );
    expect(screen.queryByTestId("workspace-rename-input")).not.toBeInTheDocument();
  });

  it("creates a new workspace from menu", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspacePill />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("workspace-pill"));
    fireEvent.click(screen.getByText("New workspace"));
    expect(screen.getByTestId("workspace-pill")).toHaveTextContent("Workspace");
  });

  it("duplicates workspace from menu", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspacePill />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("workspace-pill"));
    fireEvent.click(screen.getByText("Duplicate"));
    expect(screen.getByTestId("workspace-pill")).toHaveTextContent("Default copy");
  });

  it("renames workspace via inline menu input", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspacePill />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("workspace-pill"));
    fireEvent.click(screen.getByText("Rename…"));
    const input = screen.getByTestId("workspace-rename-input");
    fireEvent.change(input, { target: { value: "Trading Desk" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("workspace-pill")).toHaveTextContent("Trading Desk");
  });

  it("switches workspace from list", () => {
    let state = createDefaultWorkspacesState();
    state = duplicateDocument(state, state.activeDocumentId, "Morning Scan");
    window.localStorage.setItem(APP_WORKSPACES_STORAGE_KEY, JSON.stringify(state));

    render(
      <AppWorkspaceProvider>
        <WorkspacePill />
      </AppWorkspaceProvider>,
    );

    fireEvent.click(screen.getByTestId("workspace-pill"));
    const menu = screen.getByTestId("workspace-pill-menu");
    fireEvent.click(within(menu).getByText("Morning Scan"));
    expect(screen.getByTestId("workspace-pill")).toHaveTextContent("Morning Scan");
  });
});
