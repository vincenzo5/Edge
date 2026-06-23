import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PresetEnvelope } from "@/lib/chart/presets/types";

const remotePreset: PresetEnvelope = {
  id: "preset-remote",
  name: "Remote Template",
  version: 1,
  createdAt: 1,
  kind: "chart",
  payload: {
    chartType: "candles",
    indicators: [],
  },
};

const mocks = vi.hoisted(() => ({
  fetchChartTemplateLibrary: vi.fn(),
  saveChartTemplateLibraryRemote: vi.fn(),
  loadPresets: vi.fn(),
  savePresets: vi.fn(),
  getChartTemplateLibrarySyncMetadata: vi.fn(),
  setChartTemplateLibrarySyncMetadata: vi.fn(),
}));

vi.mock("@/lib/persistence/client/chartTemplateLibraryClient", () => ({
  fetchChartTemplateLibrary: mocks.fetchChartTemplateLibrary,
  saveChartTemplateLibraryRemote: mocks.saveChartTemplateLibraryRemote,
  presetsFromTemplateSnapshot: (snapshot: { presets: PresetEnvelope[] }) => snapshot.presets,
}));

vi.mock("@/lib/presetStorage", () => ({
  loadPresets: mocks.loadPresets,
  savePresets: mocks.savePresets,
}));

vi.mock("@/lib/persistence/sync/syncMetadata", () => ({
  getChartTemplateLibrarySyncMetadata: mocks.getChartTemplateLibrarySyncMetadata,
  setChartTemplateLibrarySyncMetadata: mocks.setChartTemplateLibrarySyncMetadata,
  isRemoteNewer: vi.fn(() => false),
}));

import { useChartTemplateLibraryRemoteSync } from "./useChartTemplateLibraryRemoteSync";

describe("useChartTemplateLibraryRemoteSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.fetchChartTemplateLibrary.mockResolvedValue({
      schemaVersion: 1,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      templateSnapshot: {
        version: 1,
        presets: [remotePreset],
      },
    });
    mocks.loadPresets.mockReturnValue([]);
    mocks.getChartTemplateLibrarySyncMetadata.mockReturnValue(null);
  });

  it("applies remote presets on first hydrate when local presets are empty", async () => {
    renderHook(() => useChartTemplateLibraryRemoteSync());

    await waitFor(() => {
      expect(mocks.savePresets).toHaveBeenCalledWith([remotePreset], { notify: false });
      expect(mocks.setChartTemplateLibrarySyncMetadata).toHaveBeenCalledWith({
        syncRevision: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
      });
    });

    expect(mocks.saveChartTemplateLibraryRemote).not.toHaveBeenCalled();
  });
});
