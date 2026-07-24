import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET } from "./route";
import { PATCH } from "./[id]/route";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  listConnections: vi.fn(async () => [
    {
      id: "ib-paper",
      kind: "ib_gateway_sidecar" as const,
      authKind: "local_gateway" as const,
      broker: "ib" as const,
      environment: "paper" as const,
      displayName: "IB Gateway (Paper)",
      status: "unknown" as const,
    },
  ]),
  getConnection: vi.fn(async () => ({
    id: "ib-paper",
    kind: "ib_gateway_sidecar" as const,
    authKind: "local_gateway" as const,
    broker: "ib" as const,
    environment: "paper" as const,
    displayName: "IB Gateway (Paper)",
    status: "unknown" as const,
  })),
  updateConnection: vi.fn(async () => ({
    id: "ib-paper",
    kind: "ib_gateway_sidecar" as const,
    authKind: "local_gateway" as const,
    broker: "ib" as const,
    environment: "paper" as const,
    displayName: "Paper IB",
    status: "unknown" as const,
  })),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/repositories/connectionsRepository", () => ({
  listConnections: mocks.listConnections,
  getConnection: mocks.getConnection,
  updateConnection: mocks.updateConnection,
}));

describe("/api/me/connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("returns 503 when persistence is unavailable", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("lists seeded connections", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connections).toHaveLength(1);
    expect(mocks.listConnections).toHaveBeenCalledWith("user-1");
  });
});

describe("/api/me/connections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  it("patches displayName", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/me/connections/ib-paper", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Paper IB" }),
      }),
      { params: Promise.resolve({ id: "ib-paper" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.displayName).toBe("Paper IB");
  });

  it("rejects empty patch payloads", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/me/connections/ib-paper", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "ib-paper" }) },
    );
    expect(res.status).toBe(400);
  });
});
