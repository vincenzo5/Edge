import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  listResearchSessions: vi.fn(async () => [
    {
      id: "session-1",
      title: "NVDA scan",
      schemaVersion: 1 as const,
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      cardCount: 2,
      linkCount: 1,
    },
  ]),
  createResearchSession: vi.fn(async () => ({
    id: "session-2",
    title: "Research session",
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-02T00:00:00.000Z",
    cards: [],
    links: [],
    threadIds: [],
    reel: [],
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/researchSessionsRepository", () => ({
  listResearchSessions: mocks.listResearchSessions,
  createResearchSession: mocks.createResearchSession,
}));

describe("/api/me/research-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists sessions for the authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.listResearchSessions).toHaveBeenCalledWith("user-1");
    const json = await res.json();
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].id).toBe("session-1");
  });

  it("POST creates a session with optional client id", async () => {
    const res = await POST(
      new Request("http://localhost/api/me/research-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          id: "22222222-2222-4222-8222-222222222222",
          title: "New board",
          cards: [],
          links: [],
          threadIds: [],
          reel: [],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mocks.createResearchSession).toHaveBeenCalledWith({
      userId: "user-1",
      id: "22222222-2222-4222-8222-222222222222",
      title: "New board",
      question: undefined,
      cards: [],
      links: [],
      threadIds: [],
      reel: [],
    });
  });
});
