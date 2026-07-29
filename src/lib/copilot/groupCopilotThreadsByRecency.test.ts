import { describe, expect, it } from "vitest";
import {
  getCopilotThreadRecencyBucket,
  groupCopilotThreadsByRecency,
  limitCopilotThreads,
} from "./groupCopilotThreadsByRecency";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

function thread(id: string, updatedAt: string, title = id): CopilotThreadSummary {
  return {
    id,
    title,
    schemaVersion: 1,
    syncRevision: 1,
    updatedAt,
    messageCount: 1,
  };
}

describe("groupCopilotThreadsByRecency", () => {
  const now = new Date("2026-07-29T15:00:00.000Z");

  it("groups threads into today, yesterday, and earlier buckets", () => {
    const threads = [
      thread("today", "2026-07-29T10:00:00.000Z"),
      thread("yesterday", "2026-07-28T10:00:00.000Z"),
      thread("earlier", "2026-07-20T10:00:00.000Z"),
    ];

    const groups = groupCopilotThreadsByRecency(threads, now);

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(groups[0]?.threads[0]?.id).toBe("today");
    expect(groups[1]?.threads[0]?.id).toBe("yesterday");
    expect(groups[2]?.threads[0]?.id).toBe("earlier");
  });

  it("sorts threads newest first within each bucket", () => {
    const threads = [
      thread("older-yesterday", "2026-07-28T08:00:00.000Z"),
      thread("newer-yesterday", "2026-07-28T20:00:00.000Z"),
    ];

    const groups = groupCopilotThreadsByRecency(threads, now);
    expect(groups[0]?.threads.map((entry) => entry.id)).toEqual([
      "newer-yesterday",
      "older-yesterday",
    ]);
  });

  it("limits visible threads and reports overflow", () => {
    const threads = Array.from({ length: 18 }, (_, index) =>
      thread(`t-${index}`, `2026-07-${String(29 - index).padStart(2, "0")}T10:00:00.000Z`),
    );

    const { visible, hasMore } = limitCopilotThreads(threads, 15);
    expect(visible).toHaveLength(15);
    expect(hasMore).toBe(true);
  });

  it("classifies recency buckets from updatedAt", () => {
    const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0).toISOString();
    const yesterdayIso = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      10,
      0,
      0,
    ).toISOString();
    const earlierIso = new Date(now.getFullYear(), now.getMonth(), 1, 10, 0, 0).toISOString();

    expect(getCopilotThreadRecencyBucket(todayIso, now)).toBe("today");
    expect(getCopilotThreadRecencyBucket(yesterdayIso, now)).toBe("yesterday");
    expect(getCopilotThreadRecencyBucket(earlierIso, now)).toBe("earlier");
  });
});
