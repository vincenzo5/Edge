import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { buildAppWorkspaceSnapshot } from "./workspaceSnapshot";

describe("buildAppWorkspaceSnapshot", () => {
  it("includes layout sync and chrome fields", () => {
    const snapshot = buildAppWorkspaceSnapshot(
      {
        ...DEFAULT_LAYOUT,
        linkDrawings: true,
        toolbarPrefs: { magnet: true, keepDrawing: true },
        sidebar: {
          activePanel: "watchlist",
          presentation: { watchlist: "floating" },
        },
      },
      true,
    );

    expect(snapshot.hydrated).toBe(true);
    expect(snapshot.linkDrawings).toBe(true);
    expect(snapshot.toolbarPrefs.magnet).toBe(true);
    expect(snapshot.sidebar.activePanel).toBe("watchlist");
    expect(snapshot.sidebar.presentation?.watchlist).toBe("floating");
    expect(snapshot.cells[0]?.symbol).toBe(DEFAULT_LAYOUT.cells[0]?.symbol);
  });
});
