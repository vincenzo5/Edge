import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isManageWorkerEnabled,
  resetManageWorkerForTests,
  startManageWorker,
} from "./manageWorker";

const evaluatePlaybooks = vi.fn(async () => ({
  evaluated: 0,
  fired: 0,
  skipped: 0,
  promoted: 0,
  errors: [] as string[],
}));

const listActivePlaybookInstances = vi.fn(async () => [] as unknown[]);

vi.mock("@/lib/trading/tradingService", () => ({
  getTradingService: () => ({
    listActivePlaybookInstances,
    evaluatePlaybooks,
  }),
}));

describe("manageWorker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetManageWorkerForTests();
    evaluatePlaybooks.mockClear();
    listActivePlaybookInstances.mockClear();
    delete process.env.EDGE_MANAGE_WORKER;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    resetManageWorkerForTests();
    vi.useRealTimers();
  });

  it("is disabled in test env by default", () => {
    process.env.NODE_ENV = "test";
    expect(isManageWorkerEnabled()).toBe(false);
  });

  it("ticks evaluatePlaybooks when armed instances exist", async () => {
    listActivePlaybookInstances.mockResolvedValueOnce([{ id: "inst-1" }]);
    startManageWorker();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(evaluatePlaybooks).toHaveBeenCalledTimes(1);
  });

  it("uses idle cadence when no armed instances", async () => {
    startManageWorker();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(listActivePlaybookInstances).toHaveBeenCalled();
    expect(evaluatePlaybooks).not.toHaveBeenCalled();
  });
});
