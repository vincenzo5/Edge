import { beforeEach, describe, expect, it, vi } from "vitest";

import * as readiness from "@/lib/observability/readiness";

import { GET } from "./route";

vi.mock("@/lib/observability/readiness", () => ({
  checkReadiness: vi.fn(async () => ({ ok: true, reasons: [] })),
}));

describe("/readyz GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when readiness passes", async () => {
    vi.mocked(readiness.checkReadiness).mockResolvedValue({
      ok: true,
      reasons: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json).toEqual({ ok: true });
  });

  it("returns 503 with fixed reason codes when readiness fails", async () => {
    vi.mocked(readiness.checkReadiness).mockResolvedValue({
      ok: false,
      reasons: ["postgres_unavailable", "redis_unavailable"],
    });

    const res = await GET();
    expect(res.status).toBe(503);
    const json = (await res.json()) as {
      ok: boolean;
      reasons: string[];
    };
    expect(json).toEqual({
      ok: false,
      reasons: ["postgres_unavailable", "redis_unavailable"],
    });
    const body = JSON.stringify(json);
    expect(body).not.toMatch(/postgres:\/\//);
    expect(body).not.toMatch(/redis:\/\//);
    expect(body).not.toMatch(/DATABASE_URL/);
    expect(body).not.toMatch(/REDIS_URL/);
    expect(body).not.toMatch(/stack/i);
  });
});
