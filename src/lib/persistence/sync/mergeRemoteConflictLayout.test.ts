import { describe, expect, it } from "vitest";

import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { mergeRemoteConflictLayout } from "./mergeRemoteConflictLayout";

describe("mergeRemoteConflictLayout", () => {
  it("preserves local sidebar activePanel over remote null", () => {
    const local = {
      ...DEFAULT_LAYOUT,
      sidebar: { activePanel: "watchlist" as const },
    };
    const remote = {
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
      sidebar: { activePanel: null },
    };

    const merged = mergeRemoteConflictLayout(local, remote);

    expect(merged.cells[0]?.symbol).toBe("MSFT");
    expect(merged.sidebar?.activePanel).toBe("watchlist");
  });

  it("uses remote sidebar activePanel when local is null", () => {
    const local = {
      ...DEFAULT_LAYOUT,
      sidebar: { activePanel: null },
    };
    const remote = {
      ...DEFAULT_LAYOUT,
      sidebar: { activePanel: "options" as const },
    };

    expect(mergeRemoteConflictLayout(local, remote).sidebar?.activePanel).toBe("options");
  });
});
