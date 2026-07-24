import { describe, expect, it } from "vitest";
import { createStubAppActions } from "./stubAppActions";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";

describe("createStubAppActions", () => {
  it("returns default layout and hydrated state", () => {
    const actions = createStubAppActions();
    expect(actions.getLayout()).toEqual(DEFAULT_LAYOUT);
    expect(actions.isHydrated()).toBe(true);
  });

  it("no-ops mutators without throwing", () => {
    const actions = createStubAppActions();
    expect(() => {
      actions.applyCellUpdate(0, DEFAULT_LAYOUT.cells[0]!);
      actions.patchActiveCell({ symbol: "AAPL" });
      actions.setActiveCellIndex(0);
      actions.setLayoutId(DEFAULT_LAYOUT.layoutId);
      actions.setGridMode(DEFAULT_LAYOUT.layoutId);
      actions.setLayoutSync({ linkSymbol: true });
      actions.setTheme("light");
      actions.setSidebarPanel("copilot");
    }).not.toThrow();
  });
});
