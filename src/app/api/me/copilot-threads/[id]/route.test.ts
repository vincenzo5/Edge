import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PUT, DELETE } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getCopilotThreadById: vi.fn(async () => ({
    id: "thread-1",
    title: "Chart review",
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    messages: [],
  })),
  saveCopilotThread: vi.fn(async () => ({
    ok: true as const,
    record: {
      id: "thread-1",
      title: "Chart review",
      schemaVersion: 1 as const,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      messages: [],
    },
  })),
  archiveCopilotThread: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/copilotThreadsRepository", () => ({
  getCopilotThreadById: mocks.getCopilotThreadById,
  saveCopilotThread: mocks.saveCopilotThread,
  archiveCopilotThread: mocks.archiveCopilotThread,
}));

describe("/api/me/copilot-threads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns a thread including archived lookup", async () => {
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "thread-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getCopilotThreadById).toHaveBeenCalledWith("user-1", "thread-1", {
      includeArchived: true,
    });
  });

  it("PUT saves thread messages", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/copilot-threads/thread-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 1,
          title: "Renamed",
          messages: [],
        }),
      }),
      { params: Promise.resolve({ id: "thread-1" }) },
    );

    expect(res.status).toBe(200);
    expect(mocks.saveCopilotThread).toHaveBeenCalledWith({
      userId: "user-1",
      threadId: "thread-1",
      title: "Renamed",
      messages: [],
      baseRevision: 1,
    });
  });

  it("DELETE archives a thread", async () => {
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "thread-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.archiveCopilotThread).toHaveBeenCalledWith("user-1", "thread-1");
  });
});
