import type { AppActions } from "@/lib/ai/context";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";

/** Minimal AppActions for standalone Copilot pages without a live chart workspace. */
export function createStubAppActions(): AppActions {
  return {
    getLayout: () => DEFAULT_LAYOUT,
    isHydrated: () => true,
    applyCellUpdate: () => {},
    patchActiveCell: () => {},
    setActiveCellIndex: () => {},
    setLayoutId: () => {},
    setGridMode: () => {},
    setLayoutSync: () => {},
    setTheme: () => {},
    setSidebarPanel: () => {},
  };
}
