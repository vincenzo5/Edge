import { describe, expect, it } from "vitest";

import { createDefaultWorkspaceTabs } from "../workspaceTabs";
import { seedWorkspaceTabsFromBinding } from "./seedWorkspaceTabsFromBinding";

describe("seedWorkspaceTabsFromBinding", () => {
  it("attaches chartWorkspaceId to active tab remote metadata", () => {
    const tabs = createDefaultWorkspaceTabs();
    const seeded = seedWorkspaceTabsFromBinding(tabs, {
      tileId: "tile-a",
      isPrimaryChartTile: false,
      chartWorkspaceId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(seeded.tabs[0]?.remote?.resourceId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("is a no-op when chartWorkspaceId is absent", () => {
    const tabs = createDefaultWorkspaceTabs();
    expect(
      seedWorkspaceTabsFromBinding(tabs, {
        tileId: "tile-a",
        isPrimaryChartTile: true,
      }),
    ).toBe(tabs);
  });
});
