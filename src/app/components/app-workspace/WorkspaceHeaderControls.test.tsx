import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import WorkspaceHeaderControls from "./WorkspaceHeaderControls";
import { AppWorkspaceProvider } from "./AppWorkspaceContext";
import { APP_WORKSPACES_STORAGE_KEY } from "@/lib/appWorkspace/storage";
import { resetAppWorkspaceIdCounterForTests } from "@/lib/appWorkspace/ids";

describe("WorkspaceHeaderControls", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
    window.localStorage.removeItem(APP_WORKSPACES_STORAGE_KEY);
  });

  it("shows workspace pill and Edit layout in use mode", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspaceHeaderControls />
      </AppWorkspaceProvider>,
    );
    expect(screen.getByTestId("workspace-pill")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-layout-edit")).toHaveTextContent("Edit layout");
    expect(screen.queryByTestId("workspace-name-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-doc-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-duplicate")).not.toBeInTheDocument();
  });

  it("toggles to Done in edit mode", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspaceHeaderControls />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("workspace-layout-edit"));
    expect(screen.getByTestId("workspace-layout-done")).toHaveTextContent("Done");
    fireEvent.click(screen.getByTestId("workspace-layout-done"));
    expect(screen.getByTestId("workspace-layout-edit")).toBeInTheDocument();
  });

  it("shows editing label and layout preset picker only in edit mode", () => {
    render(
      <AppWorkspaceProvider>
        <WorkspaceHeaderControls />
      </AppWorkspaceProvider>,
    );
    expect(screen.queryByTestId("workspace-editing-label")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-layout-preset-trigger")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-pill")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("workspace-layout-edit"));
    expect(screen.getByTestId("workspace-editing-label")).toHaveTextContent("Editing · Default");
    expect(screen.getByTestId("workspace-layout-preset-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-pill")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("workspace-layout-done"));
    expect(screen.queryByTestId("workspace-layout-preset-trigger")).not.toBeInTheDocument();
    expect(screen.getByTestId("workspace-pill")).toBeInTheDocument();
  });
});
