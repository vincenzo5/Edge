import { describe, expect, it } from "vitest";

import {
  archiveLocalCopilotThread,
  listLocalCopilotThreadSummaries,
  readLocalCopilotThreadsSnapshot,
  upsertLocalCopilotThread,
  writeLocalCopilotThreadsSnapshot,
  COPILOT_THREADS_LOCAL_STORAGE_KEY,
} from "@/lib/copilot/localCopilotThreadsStore";

describe("localCopilotThreadsStore", () => {
  it("upserts and lists non-archived threads", () => {
    writeLocalCopilotThreadsSnapshot({
      schemaVersion: 1,
      activeThreadId: null,
      threads: {},
    });

    upsertLocalCopilotThread({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Chart review",
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: "2026-07-22T12:00:00.000Z",
      messages: [],
      modelId: "anthropic/claude-opus-4.8",
    });

    const summaries = listLocalCopilotThreadSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.title).toBe("Chart review");

    const snapshot = readLocalCopilotThreadsSnapshot();
    expect(
      snapshot.threads["11111111-1111-4111-8111-111111111111"]?.modelId,
    ).toBe("anthropic/claude-opus-4.8");

    archiveLocalCopilotThread("11111111-1111-4111-8111-111111111111");
    expect(listLocalCopilotThreadSummaries()).toHaveLength(0);
    expect(
      readLocalCopilotThreadsSnapshot().threads["11111111-1111-4111-8111-111111111111"]
        ?.archivedAt,
    ).toBeTruthy();
  });

  it("uses the expected storage key", () => {
    expect(COPILOT_THREADS_LOCAL_STORAGE_KEY).toBe("tv-ai:copilot-threads:v1");
  });
});
