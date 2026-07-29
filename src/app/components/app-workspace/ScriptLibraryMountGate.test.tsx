/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";

import AppWorkspaceShell from "./AppWorkspaceShell";
import { useAppWorkspace } from "./AppWorkspaceContext";
import { useScriptLibraryMountRequest } from "./ScriptLibraryMountGate";
import {
  HeaderCenterSlotProvider,
  useHeaderCenterSlot,
} from "../home/HeaderCenterSlot";

const scriptLibraryProviderSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/scriptLibrary/ScriptLibraryContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scriptLibrary/ScriptLibraryContext")>();
  return {
    ...actual,
    ScriptLibraryProvider: ({ children }: { children: React.ReactNode }) => {
      scriptLibraryProviderSpy();
      return <div data-testid="script-library-provider">{children}</div>;
    },
  };
});

vi.mock("./LayoutTreeView", () => ({
  default: () => <div data-testid="layout-tree-view" />,
}));

vi.mock("./WorkspaceHeaderControls", () => ({
  default: () => null,
}));

vi.mock("./WorkspaceBrowserTabQuote", () => ({
  default: () => null,
}));

vi.mock("../home/ModuleRouteTracker", () => ({
  default: () => null,
}));

vi.mock("@/lib/persistence/sync/useAppWorkspacesRemoteSync", () => ({
  useAppWorkspacesRemoteSync: () => {},
}));

function RequestScriptLibraryHarness() {
  const requestScriptLibrary = useScriptLibraryMountRequest();

  useEffect(() => {
    requestScriptLibrary();
  }, [requestScriptLibrary]);

  return <div data-testid="request-script-library" />;
}

function AssignScriptsTileHarness() {
  const { document, assignWorkspaceTileSurface } = useAppWorkspace();
  const firstTileId = Object.keys(document.tiles)[0];

  useEffect(() => {
    if (firstTileId) {
      assignWorkspaceTileSurface(firstTileId, "scripts");
    }
  }, [assignWorkspaceTileSurface, firstTileId]);

  return <div data-testid="scripts-tile-assigned" />;
}

function HeaderSlotMount() {
  return <>{useHeaderCenterSlot()}</>;
}

function renderShell(children?: React.ReactNode) {
  return render(
    <HeaderCenterSlotProvider>
      <HeaderSlotMount />
      <AppWorkspaceShell>{children}</AppWorkspaceShell>
    </HeaderCenterSlotProvider>,
  );
}

describe("ScriptLibraryMountGate", () => {
  beforeEach(() => {
    scriptLibraryProviderSpy.mockClear();
    window.localStorage.clear();
  });

  it("keeps ScriptLibraryProvider mounted on chart-only workspace without hydrating", async () => {
    renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("layout-tree-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("workspace-header-controls-portal")).toBeInTheDocument();
    expect(screen.getByTestId("script-library-provider")).toBeInTheDocument();
    expect(scriptLibraryProviderSpy).toHaveBeenCalled();
  });

  it("preserves child DOM identity when requestScriptLibrary activates hydrate", async () => {
    const childMountCounts = new Map<string, number>();

    function StableChild() {
      const id = "stable-child";
      childMountCounts.set(id, (childMountCounts.get(id) ?? 0) + 1);
      return <div data-testid={id} />;
    }

    renderShell(
      <>
        <StableChild />
        <RequestScriptLibraryHarness />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("script-library-provider")).toBeInTheDocument();
    });

    expect(childMountCounts.get("stable-child")).toBe(1);
  });

  it("mounts ScriptLibraryProvider when scripts tile is assigned", async () => {
    renderShell(<AssignScriptsTileHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("script-library-provider")).toBeInTheDocument();
    });
    expect(scriptLibraryProviderSpy).toHaveBeenCalled();
  });

  it("mounts ScriptLibraryProvider after requestScriptLibrary", async () => {
    renderShell(<RequestScriptLibraryHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("script-library-provider")).toBeInTheDocument();
    });
    expect(scriptLibraryProviderSpy).toHaveBeenCalled();
  });
});
