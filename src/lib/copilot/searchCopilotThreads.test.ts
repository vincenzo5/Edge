import { describe, expect, it } from "vitest";
import { searchCopilotThreads } from "./searchCopilotThreads";
import type { LocalCopilotThreadsSnapshot } from "./localCopilotThreadsStore";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

const THREAD_A = "11111111-1111-4111-8111-111111111111";
const THREAD_B = "22222222-2222-4222-8222-222222222222";

const summaries: CopilotThreadSummary[] = [
  {
    id: THREAD_A,
    title: "Chart summary",
    schemaVersion: 1,
    syncRevision: 1,
    updatedAt: "2026-07-29T10:00:00.000Z",
    messageCount: 2,
  },
  {
    id: THREAD_B,
    title: "Portfolio review",
    schemaVersion: 1,
    syncRevision: 1,
    updatedAt: "2026-07-28T10:00:00.000Z",
    messageCount: 2,
  },
];

const snapshot: LocalCopilotThreadsSnapshot = {
  schemaVersion: 1,
  activeThreadId: THREAD_A,
  threads: {
    [THREAD_A]: {
      id: THREAD_A,
      title: "Chart summary",
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: "2026-07-29T10:00:00.000Z",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "Compare NVDA and AMD momentum",
          toolSteps: [],
        },
      ],
    },
    [THREAD_B]: {
      id: THREAD_B,
      title: "Portfolio review",
      schemaVersion: 1,
      syncRevision: 1,
      updatedAt: "2026-07-28T10:00:00.000Z",
      messages: [
        {
          id: "m2",
          role: "user",
          content: "Show my open positions",
          toolSteps: [],
        },
      ],
    },
  },
};

describe("searchCopilotThreads", () => {
  it("returns all threads when query is empty", () => {
    const results = searchCopilotThreads(summaries, "", snapshot);
    expect(results.map((entry) => entry.thread.id)).toEqual([THREAD_A, THREAD_B]);
  });

  it("matches thread titles case-insensitively", () => {
    const results = searchCopilotThreads(summaries, "portfolio", snapshot);
    expect(results).toHaveLength(1);
    expect(results[0]?.thread.id).toBe(THREAD_B);
  });

  it("matches message bodies from the local snapshot", () => {
    const results = searchCopilotThreads(summaries, "nvda", snapshot);
    expect(results).toHaveLength(1);
    expect(results[0]?.thread.id).toBe(THREAD_A);
    expect(results[0]?.snippet?.toLowerCase()).toContain("nvda");
  });
});
