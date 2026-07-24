import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockEvaluatePlaybooks = vi.fn();

vi.mock("@/lib/trading/tradingService", () => ({
  isTradingConfigured: vi.fn(() => true),
  getTradingService: vi.fn(() => ({
    evaluatePlaybooks: mockEvaluatePlaybooks,
  })),
}));

const resolveCronUserIdMock = vi.fn(async () => "user-1");

vi.mock("@/lib/api/cronAuth", () => ({
  resolveCronUserId: (...args: unknown[]) => resolveCronUserIdMock(...args),
}));

describe("/api/cron/playbook-evaluate", () => {
  beforeEach(() => {
    mockEvaluatePlaybooks.mockReset();
    resolveCronUserIdMock.mockResolvedValue("user-1");
  });

  it("returns evaluation summary", async () => {
    mockEvaluatePlaybooks.mockResolvedValue({
      evaluated: 2,
      fired: 1,
      skipped: 0,
      errors: [],
    });

    const { GET } = await import("@/app/api/cron/playbook-evaluate/route");
    const res = await GET(new NextRequest("http://localhost/api/cron/playbook-evaluate"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ evaluated: 2, fired: 1, skipped: 0, errors: [] });
  });

  it("returns 401 when cron auth fails", async () => {
    resolveCronUserIdMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/playbook-evaluate/route");
    const res = await GET(new NextRequest("http://localhost/api/cron/playbook-evaluate"));
    expect(res.status).toBe(401);
  });
});
