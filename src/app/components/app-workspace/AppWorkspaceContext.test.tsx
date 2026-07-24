import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AppWorkspaceProvider, clearWorkspaceBootstrapCacheForTests, useAppWorkspace } from "./AppWorkspaceContext";
import { APP_WORKSPACES_STORAGE_KEY } from "@/lib/appWorkspace/storage";
import { resetAppWorkspaceIdCounterForTests } from "@/lib/appWorkspace/ids";
import type { AppWorkspacesState } from "@/lib/appWorkspace/types";

const remoteSync = vi.hoisted(() => ({
  applyRemote: null as null | ((state: AppWorkspacesState) => void),
}));

vi.mock("@/lib/persistence/sync/useAppWorkspacesRemoteSync", () => ({
  useAppWorkspacesRemoteSync: (options: {
    onApplyRemoteState: (state: AppWorkspacesState) => void;
  }) => {
    remoteSync.applyRemote = options.onApplyRemoteState;
  },
}));

vi.mock("@/lib/app/bootstrap/resolveAppWorkspacesBootstrap", () => ({
  resolveAppWorkspacesBootstrap: async (local: AppWorkspacesState) => ({
    state: local,
    remoteApplied: false,
    remotePending: false,
  }),
}));

function ModeProbe() {
  const { layoutEditMode, setLayoutEditMode, toggleLayoutEditMode } = useAppWorkspace();
  return (
    <div>
      <span data-testid="layout-edit-mode">{layoutEditMode}</span>
      <button type="button" data-testid="enter-edit" onClick={() => setLayoutEditMode("edit")}>
        Enter edit
      </button>
      <button type="button" data-testid="toggle-edit" onClick={() => toggleLayoutEditMode()}>
        Toggle
      </button>
    </div>
  );
}

function Probe() {
  const { document, openSurfaceInWorkspace } = useAppWorkspace();
  return (
    <div>
      <span data-testid="tile-count">{Object.keys(document.tiles).length}</span>
      <button
        type="button"
        data-testid="open-screener"
        onClick={() => openSurfaceInWorkspace("screener", { region: "right" })}
      >
        Open
      </button>
    </div>
  );
}

describe("AppWorkspaceProvider", () => {
  beforeEach(() => {
    clearWorkspaceBootstrapCacheForTests();
    resetAppWorkspaceIdCounterForTests();
    window.localStorage.removeItem(APP_WORKSPACES_STORAGE_KEY);
  });

  it("starts with one chart tile", () => {
    render(
      <AppWorkspaceProvider>
        <Probe />
      </AppWorkspaceProvider>,
    );
    expect(screen.getByTestId("tile-count")).toHaveTextContent("1");
  });

  it("opens a second tile", () => {
    render(
      <AppWorkspaceProvider>
        <Probe />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("open-screener"));
    expect(screen.getByTestId("tile-count")).toHaveTextContent("2");
  });

  it("focusOrOpenSurface does not duplicate an existing surface", () => {
    function FocusProbe() {
      const { document, focusOrOpenSurface } = useAppWorkspace();
      return (
        <div>
          <span data-testid="tile-count">{Object.keys(document.tiles).length}</span>
          <button
            type="button"
            data-testid="focus-chart"
            onClick={() => focusOrOpenSurface("chart", { region: "right" })}
          >
            Focus chart
          </button>
        </div>
      );
    }
    render(
      <AppWorkspaceProvider>
        <FocusProbe />
      </AppWorkspaceProvider>,
    );
    expect(screen.getByTestId("tile-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("focus-chart"));
    expect(screen.getByTestId("tile-count")).toHaveTextContent("1");
  });

  it("defaults to use layout mode", () => {
    render(
      <AppWorkspaceProvider>
        <ModeProbe />
      </AppWorkspaceProvider>,
    );
    expect(screen.getByTestId("layout-edit-mode")).toHaveTextContent("use");
  });

  it("focusOrOpenSurface enters edit when surface is missing in use mode", () => {
    function ScreenerProbe() {
      const { document, focusOrOpenSurface, layoutEditMode } = useAppWorkspace();
      return (
        <div>
          <span data-testid="tile-count">{Object.keys(document.tiles).length}</span>
          <span data-testid="layout-edit-mode">{layoutEditMode}</span>
          <button
            type="button"
            data-testid="focus-screener"
            onClick={() => focusOrOpenSurface("screener", { region: "right" })}
          >
            Focus screener
          </button>
        </div>
      );
    }
    render(
      <AppWorkspaceProvider>
        <ScreenerProbe />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("focus-screener"));
    expect(screen.getByTestId("tile-count")).toHaveTextContent("2");
    expect(screen.getByTestId("layout-edit-mode")).toHaveTextContent("edit");
  });

  it("handleSurfaceIngress updates existing tile surface state", () => {
    function IngressProbe() {
      const { document, handleSurfaceIngress, openSurfaceInWorkspace } = useAppWorkspace();
      return (
        <div>
          <span data-testid="screener-view">
            {Object.values(document.tiles).find((tile) => tile.surfaceId === "screener")
              ?.surfaceState?.screenerView ?? "none"}
          </span>
          <button
            type="button"
            data-testid="open-screener"
            onClick={() => openSurfaceInWorkspace("screener", { region: "right" })}
          >
            Open screener
          </button>
          <button
            type="button"
            data-testid="ingress-screener-screens"
            onClick={() =>
              handleSurfaceIngress("screener", { surfaceState: { screenerView: "screens" } })
            }
          >
            Ingress screener screens
          </button>
        </div>
      );
    }
    render(
      <AppWorkspaceProvider>
        <IngressProbe />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("open-screener"));
    expect(screen.getByTestId("screener-view")).toHaveTextContent("none");
    fireEvent.click(screen.getByTestId("ingress-screener-screens"));
    expect(screen.getByTestId("screener-view")).toHaveTextContent("screens");
  });

  it("handleSurfaceIngress is stable across repeated calls with same surface state", () => {
    function IngressLoopProbe() {
      const { document, handleSurfaceIngress, openSurfaceInWorkspace } = useAppWorkspace();
      const screenerView =
        Object.values(document.tiles).find((tile) => tile.surfaceId === "screener")?.surfaceState
          ?.screenerView ?? "none";

      return (
        <div>
          <span data-testid="screener-view">{screenerView}</span>
          <span data-testid="tile-count">{Object.keys(document.tiles).length}</span>
          <button
            type="button"
            data-testid="open-screener"
            onClick={() => openSurfaceInWorkspace("screener", { region: "right" })}
          >
            Open screener
          </button>
          <button
            type="button"
            data-testid="ingress-screens"
            onClick={() => {
              handleSurfaceIngress("screener", { surfaceState: { screenerView: "screens" } });
              handleSurfaceIngress("screener", { surfaceState: { screenerView: "screens" } });
            }}
          >
            Ingress screens twice
          </button>
        </div>
      );
    }

    render(
      <AppWorkspaceProvider>
        <IngressLoopProbe />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("open-screener"));
    fireEvent.click(screen.getByTestId("ingress-screens"));
    expect(screen.getByTestId("screener-view")).toHaveTextContent("screens");
    expect(screen.getByTestId("tile-count")).toHaveTextContent("2");
  });

  it("toggleLayoutEditMode switches between use and edit", () => {
    render(
      <AppWorkspaceProvider>
        <ModeProbe />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("toggle-edit"));
    expect(screen.getByTestId("layout-edit-mode")).toHaveTextContent("edit");
    fireEvent.click(screen.getByTestId("toggle-edit"));
    expect(screen.getByTestId("layout-edit-mode")).toHaveTextContent("use");
  });

  it("does not persist layout edits until Done", async () => {
    vi.useFakeTimers();

    function SaveProbe() {
      const {
        enterLayoutEdit,
        applyWorkspaceLayoutPreset,
        requestExitLayoutEdit,
        isLayoutDirty,
        layoutEditMode,
      } = useAppWorkspace();
      return (
        <div>
          <span data-testid="dirty">{String(isLayoutDirty)}</span>
          <span data-testid="layout-edit-mode">{layoutEditMode}</span>
          <button type="button" data-testid="enter-edit" onClick={() => enterLayoutEdit()}>
            Enter edit
          </button>
          <button
            type="button"
            data-testid="apply-grid"
            onClick={() => applyWorkspaceLayoutPreset("grid-2x2")}
          >
            Apply grid
          </button>
          <button type="button" data-testid="request-exit" onClick={() => requestExitLayoutEdit()}>
            Done
          </button>
        </div>
      );
    }

    render(
      <AppWorkspaceProvider>
        <SaveProbe />
      </AppWorkspaceProvider>,
    );

    const before = window.localStorage.getItem(APP_WORKSPACES_STORAGE_KEY);
    fireEvent.click(screen.getByTestId("enter-edit"));
    fireEvent.click(screen.getByTestId("apply-grid"));
    expect(screen.getByTestId("dirty")).toHaveTextContent("true");
    vi.advanceTimersByTime(500);
    expect(window.localStorage.getItem(APP_WORKSPACES_STORAGE_KEY)).toBe(before);

    fireEvent.click(screen.getByTestId("request-exit"));
    expect(screen.getByTestId("layout-edit-mode")).toHaveTextContent("use");
    expect(window.localStorage.getItem(APP_WORKSPACES_STORAGE_KEY)).not.toBe(before);

    vi.useRealTimers();
  });

  it("applyWorkspaceLayoutPreset replaces tiles with placeholders", () => {
    function PresetProbe() {
      const { document, applyWorkspaceLayoutPreset } = useAppWorkspace();
      const surfaces = Object.values(document.tiles).map((tile) => tile.surfaceId).join(",");
      return (
        <div>
          <span data-testid="tile-count">{Object.keys(document.tiles).length}</span>
          <span data-testid="surfaces">{surfaces}</span>
          <button
            type="button"
            data-testid="apply-grid"
            onClick={() => applyWorkspaceLayoutPreset("grid-2x2")}
          >
            Apply grid
          </button>
        </div>
      );
    }
    render(
      <AppWorkspaceProvider>
        <PresetProbe />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("apply-grid"));
    expect(screen.getByTestId("tile-count")).toHaveTextContent("4");
    expect(screen.getByTestId("surfaces")).toHaveTextContent("placeholder,placeholder,placeholder,placeholder");
  });

  it("assignWorkspaceTileSurface fills a placeholder tile", () => {
    function AssignProbe() {
      const { document, applyWorkspaceLayoutPreset, assignWorkspaceTileSurface } =
        useAppWorkspace();
      const tileId = Object.keys(document.tiles)[0] ?? "";
      const surface = document.tiles[tileId]?.surfaceId ?? "none";
      return (
        <div>
          <span data-testid="first-surface">{surface}</span>
          <button
            type="button"
            data-testid="apply-two-cols"
            onClick={() => applyWorkspaceLayoutPreset("two-cols")}
          >
            Apply
          </button>
          <button
            type="button"
            data-testid="assign-chart"
            onClick={() => assignWorkspaceTileSurface(tileId, "chart")}
          >
            Assign chart
          </button>
        </div>
      );
    }
    render(
      <AppWorkspaceProvider>
        <AssignProbe />
      </AppWorkspaceProvider>,
    );
    fireEvent.click(screen.getByTestId("apply-two-cols"));
    expect(screen.getByTestId("first-surface")).toHaveTextContent("placeholder");
    fireEvent.click(screen.getByTestId("assign-chart"));
    expect(screen.getByTestId("first-surface")).toHaveTextContent("chart");
  });

  it("Done discards deferred remote so closed tiles stay closed after refresh", async () => {
    function CloseAlertsProbe() {
      const {
        state,
        document,
        hydrated,
        enterLayoutEdit,
        requestExitLayoutEdit,
        openSurfaceInWorkspace,
        closeWorkspaceTile,
      } = useAppWorkspace();
      const alertsTile = Object.values(document.tiles).find((tile) => tile.surfaceId === "alerts");
      const surfaces = Object.values(document.tiles)
        .map((tile) => tile.surfaceId)
        .sort()
        .join(",");
      return (
        <div>
          <span data-testid="hydrated">{String(hydrated)}</span>
          <span data-testid="surfaces">{surfaces}</span>
          <button
            type="button"
            data-testid="capture-stale"
            onClick={() => {
              (window as unknown as { __staleRemote?: AppWorkspacesState }).__staleRemote =
                JSON.parse(JSON.stringify(state)) as AppWorkspacesState;
            }}
          >
            Capture
          </button>
          <button type="button" data-testid="enter-edit" onClick={() => enterLayoutEdit()}>
            Edit
          </button>
          <button
            type="button"
            data-testid="open-alerts"
            onClick={() => openSurfaceInWorkspace("alerts", { region: "right" })}
          >
            Open alerts
          </button>
          <button
            type="button"
            data-testid="close-alerts"
            onClick={() => {
              if (alertsTile) closeWorkspaceTile(alertsTile.id);
            }}
          >
            Close alerts
          </button>
          <button type="button" data-testid="done" onClick={() => requestExitLayoutEdit()}>
            Done
          </button>
        </div>
      );
    }

    render(
      <AppWorkspaceProvider>
        <CloseAlertsProbe />
      </AppWorkspaceProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.click(screen.getByTestId("enter-edit"));
    fireEvent.click(screen.getByTestId("open-alerts"));
    expect(screen.getByTestId("surfaces")).toHaveTextContent("alerts");
    fireEvent.click(screen.getByTestId("capture-stale"));

    fireEvent.click(screen.getByTestId("close-alerts"));
    expect(screen.getByTestId("surfaces")).not.toHaveTextContent("alerts");

    const stale = (window as unknown as { __staleRemote?: AppWorkspacesState }).__staleRemote;
    expect(stale).toBeTruthy();
    await act(async () => {
      remoteSync.applyRemote?.(stale!);
    });

    fireEvent.click(screen.getByTestId("done"));
    expect(screen.getByTestId("surfaces")).not.toHaveTextContent("alerts");

    const persisted = JSON.parse(
      window.localStorage.getItem(APP_WORKSPACES_STORAGE_KEY) ?? "null",
    ) as AppWorkspacesState;
    const persistedSurfaces = Object.values(persisted.documents[0]!.tiles).map(
      (tile) => tile.surfaceId,
    );
    expect(persistedSurfaces).not.toContain("alerts");
  });
});
