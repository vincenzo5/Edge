import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PUT, DELETE } from "./route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  getResearchSessionById: vi.fn(async () => ({
    id: "session-1",
    title: "NVDA scan",
    schemaVersion: 1 as const,
    syncRevision: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    cards: [],
    links: [],
    threadIds: [],
    reel: [],
  })),
  saveResearchSession: vi.fn(async () => ({
    ok: true as const,
    record: {
      id: "session-1",
      title: "NVDA scan",
      schemaVersion: 1 as const,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      cards: [],
      links: [],
      threadIds: [],
      reel: [],
    },
  })),
  archiveResearchSession: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/researchSessionsRepository", () => ({
  getResearchSessionById: mocks.getResearchSessionById,
  saveResearchSession: mocks.saveResearchSession,
  archiveResearchSession: mocks.archiveResearchSession,
}));

describe("/api/me/research-sessions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns a session including archived lookup", async () => {
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "session-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getResearchSessionById).toHaveBeenCalledWith("user-1", "session-1", {
      includeArchived: true,
    });
  });

  it("PUT saves session payload", async () => {
    const res = await PUT(
      new Request("http://localhost/api/me/research-sessions/session-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: 1,
          title: "Renamed",
          cards: [],
          links: [],
          threadIds: [],
          reel: [],
        }),
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(res.status).toBe(200);
    expect(mocks.saveResearchSession).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "session-1",
      title: "Renamed",
      question: undefined,
      cards: [],
      links: [],
      threadIds: [],
      reel: [],
      baseRevision: 1,
    });
  });

  it("DELETE archives a session", async () => {
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "session-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.archiveResearchSession).toHaveBeenCalledWith("user-1", "session-1");
  });
});
