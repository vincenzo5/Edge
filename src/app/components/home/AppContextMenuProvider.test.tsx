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

  it("opens the app menu on control right-click", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("Chart tile"), {
      ctrlKey: true,
      button: 2,
    });
    expect(screen.getByRole("menu", { name: "Application menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
  });

  it("opens the app menu on plain right-click in the app header", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("App header"), { button: 2 });
    expect(screen.getByRole("menu", { name: "Application menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
  });

  it("does not open on plain right-click outside the app header", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("Chart tile"), { button: 2 });
    expect(screen.queryByRole("menu", { name: "Application menu" })).not.toBeInTheDocument();
  });

  it("does not open on control primary-click", () => {
    renderShell();
    fireEvent.contextMenu(screen.getByText("Chart tile"), { ctrlKey: true, button: 0 });
    expect(screen.queryByRole("menu", { name: "Application menu" })).not.toBeInTheDocument();
  });

  it("lists Change panel options inline when workspace context and tile are present", () => {
    renderShell(true);
    fireEvent.contextMenu(screen.getByText("Chart tile"), {
      ctrlKey: true,
      button: 2,
    });
    expect(screen.getByText("Change panel")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Screener" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Journal" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copilot" })).toBeInTheDocument();
  });

  it("opens settings from the app menu", () => {
    renderShell();
    expect(screen.getByTestId("settings-open")).toHaveTextContent("false");
    fireEvent.contextMenu(screen.getByText("Chart tile"), {
      ctrlKey: true,
      button: 2,
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(screen.getByTestId("settings-open")).toHaveTextContent("true");
  });
});
