import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearResearchBoardSessionForTests,
  getActiveSessionRecord,
} from "@/lib/research/boardSessionStore";
import { saveResearchSessionState } from "./researchSessionsClient";

const persistenceFetch = vi.fn();

vi.mock("@/lib/persistence/client/persistenceFetch", () => ({
  persistenceFetch: (...args: unknown[]) => persistenceFetch(...args),
}));

describe("researchSessionsClient", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
    persistenceFetch.mockReset();
  });

  it("keeps local revision when cloud is unavailable", async () => {
    const active = getActiveSessionRecord();
    persistenceFetch.mockResolvedValue(new Response(null, { status: 503 }));

    const result = await saveResearchSessionState({
      sessionId: active.id,
      syncRevision: active.syncRevision,
    });

    expect(result.syncRevision).toBe(1);
    expect(result.title).toBe("Research session");
  });

  it("updates local revision after successful cloud save", async () => {
    const active = getActiveSessionRecord();
    persistenceFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: active.id,
          title: "Research session",
          schemaVersion: 1,
          syncRevision: 2,
          updatedAt: "2026-01-02T00:00:00.000Z",
          cards: [],
          links: [],
          threadIds: [],
          reel: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await saveResearchSessionState({
      sessionId: active.id,
      syncRevision: active.syncRevision,
    });

    expect(result.syncRevision).toBe(2);
    expect(getActiveSessionRecord().syncRevision).toBe(2);
  });
});
