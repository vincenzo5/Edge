import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  listCopilotThreads: vi.fn(async () => [
    {
      id: "thread-1",
      title: "Chart review",
      schemaVersion: 1 as const,
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      messageCount: 2,
    },
  ]),
  createCopilotThread: vi.fn(async () => ({
    id: "thread-2",
    title: "New chat",
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-02T00:00:00.000Z",
    messages: [],
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/copilotThreadsRepository", () => ({
  listCopilotThreads: mocks.listCopilotThreads,
  createCopilotThread: mocks.createCopilotThread,
}));

describe("/api/me/copilot-threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists threads for the authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.listCopilotThreads).toHaveBeenCalledWith("user-1");
    const json = await res.json();
    expect(json.threads).toHaveLength(1);
    expect(json.threads[0].id).toBe("thread-1");
  });

  it("POST creates a thread with optional client id", async () => {
    const res = await POST(
      new Request("http://localhost/api/me/copilot-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          id: "22222222-2222-4222-8222-222222222222",
          title: "New chat",
          messages: [],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.createCopilotThread).toHaveBeenCalledWith({
      userId: "user-1",
      id: "22222222-2222-4222-8222-222222222222",
      title: "New chat",
      messages: [],
    });
  });
});
