import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExpectancyTileSurface from "./ExpectancyTileSurface";
import { AppWorkspaceProvider } from "./AppWorkspaceContext";
import { APP_WORKSPACES_STORAGE_KEY } from "@/lib/appWorkspace/storage";
import { resetAppWorkspaceIdCounterForTests } from "@/lib/appWorkspace/ids";
import { TileDensityOverrideProvider } from "./TileDensityContext";

vi.mock("@/lib/persistence/sync/useAppWorkspacesRemoteSync", () => ({
  useAppWorkspacesRemoteSync: () => {},
}));

vi.mock("@/lib/app/bootstrap/resolveAppWorkspacesBootstrap", () => ({
  resolveAppWorkspacesBootstrap: async (local: unknown) => ({
    state: local,
    remoteApplied: false,
    remotePending: false,
  }),
}));

describe("ExpectancyTileSurface", () => {
  beforeEach(() => {
    resetAppWorkspaceIdCounterForTests();
    window.localStorage.removeItem(APP_WORKSPACES_STORAGE_KEY);
  });

  it("renders expectancy app in a workspace tile", () => {
    render(
      <AppWorkspaceProvider>
        <TileDensityOverrideProvider mode="wide" width={1200}>
          <ExpectancyTileSurface tileId="tile-expectancy-1" />
        </TileDensityOverrideProvider>
      </AppWorkspaceProvider>,
    );

    expect(screen.getByTestId("expectancy-tile-surface")).toBeTruthy();
    expect(screen.getByTestId("expectancy-tile-surface")).toHaveAttribute(
      "data-workspace-expectancy-tile",
      "tile-expectancy-1",
    );
    expect(screen.getByTestId("expectancy-app")).toBeTruthy();
  });
});
