import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AppContextMenuProvider } from "./AppContextMenuProvider";
import { AppChromeActionsProvider, useAppChromeActions } from "./AppChromeActionsProvider";
import { AppWorkspaceProvider } from "../app-workspace/AppWorkspaceContext";

function SettingsProbe() {
  const { settingsOpen } = useAppChromeActions();
  return <span data-testid="settings-open">{String(settingsOpen)}</span>;
}

function renderShell(withWorkspace = false) {
  const content = (
    <AppChromeActionsProvider>
      <SettingsProbe />
      <AppContextMenuProvider data-testid="app-shell">
        <header data-app-context-menu-surface="true">
          <span>App header</span>
        </header>
        <div data-workspace-tile-id="tile-1" data-surface="chart">
          Chart tile
        </div>
      </AppContextMenuProvider>
    </AppChromeActionsProvider>
  );

  if (withWorkspace) {
    return render(<AppWorkspaceProvider>{content}</AppWorkspaceProvider>);
  }
  return render(content);
}

describe("AppContextMenuProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the app menu on plain right-click in the app header", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("App header"), { button: 2 });
    expect(screen.getByRole("menu", { name: "Application menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Order account" })).toBeInTheDocument();
  });

  it("opens the app menu on control right-click in the app header", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("App header"), {
      ctrlKey: true,
      button: 2,
    });
    expect(screen.getByRole("menu", { name: "Application menu" })).toBeInTheDocument();
  });

  it("does not open on control right-click outside the app header", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("Chart tile"), {
      ctrlKey: true,
      button: 2,
    });
    expect(screen.queryByRole("menu", { name: "Application menu" })).not.toBeInTheDocument();
  });

  it("does not open on plain right-click outside the app header", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("Chart tile"), { button: 2 });
    expect(screen.queryByRole("menu", { name: "Application menu" })).not.toBeInTheDocument();
  });

  it("does not open on control primary-click", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("App header"), { ctrlKey: true, button: 0 });
    expect(screen.queryByRole("menu", { name: "Application menu" })).not.toBeInTheDocument();
  });

  it("does not list Change panel options in the header app menu", () => {
    renderShell(true);
    fireEvent.contextMenu(screen.getByText("App header"), { button: 2 });
    expect(screen.queryByText("Change panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Journal" })).not.toBeInTheDocument();
  });

  it("opens settings from the app menu", () => {
    renderShell();
    expect(screen.getByTestId("settings-open")).toHaveTextContent("false");
    fireEvent.contextMenu(screen.getByText("App header"), { button: 2 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(screen.getByTestId("settings-open")).toHaveTextContent("true");
  });
});
