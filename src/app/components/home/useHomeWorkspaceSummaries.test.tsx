import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { createDefaultWorkspaceTabs } from "@/lib/app/workspaceTabs";
import { WORKSPACE_TABS_STORAGE_KEY } from "@/lib/app/workspaceTabsStorage";

vi.mock("@/lib/app/bootstrap/resolveHomeWorkspaceTabs", () => ({
  resolveHomeWorkspaceTabs: vi.fn(),
}));

vi.mock("@/lib/persistence/client/chartWorkspaceClient", () => ({
  fetchChartWorkspaces: vi.fn(),
}));

import { resolveHomeWorkspaceTabs } from "@/lib/app/bootstrap/resolveHomeWorkspaceTabs";
import { useHomeWorkspaceSummaries } from "./useHomeWorkspaceSummaries";

describe("useHomeWorkspaceSummaries", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });

    const localTabs = createDefaultWorkspaceTabs();
    localStorage.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(localTabs));

    vi.mocked(resolveHomeWorkspaceTabs).mockResolvedValue({
      tabs: localTabs,
      remoteApplied: false,
      remotePending: false,
    });
  });

  it("paints local summaries immediately then applies remote merge", async () => {
    const remoteTabs = createDefaultWorkspaceTabs({
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "NVDA" }],
    });

    vi.mocked(resolveHomeWorkspaceTabs).mockResolvedValue({
      tabs: remoteTabs,
      remoteApplied: true,
      remotePending: false,
    });

    const { result } = renderHook(() => useHomeWorkspaceSummaries());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.activeSummary?.symbol).toBe("NVDA");
    });

    expect(resolveHomeWorkspaceTabs).toHaveBeenCalled();
  });
});
