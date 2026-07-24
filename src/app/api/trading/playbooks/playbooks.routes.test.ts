import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getPlaybooks } from "@/app/api/trading/playbooks/route";
import { POST as detachPlaybook } from "@/app/api/trading/playbooks/[id]/detach/route";
import { POST as pausePlaybook } from "@/app/api/trading/playbooks/[id]/pause/route";
import { POST as resumePlaybook } from "@/app/api/trading/playbooks/[id]/resume/route";
import { POST as skipPlaybook } from "@/app/api/trading/playbooks/[id]/skip/route";

const mockListPlaybookInstances = vi.fn();
const mockDetachPlaybookInstance = vi.fn();
const mockPausePlaybookInstance = vi.fn();
const mockResumePlaybookInstance = vi.fn();
const mockSkipNextPlaybookRule = vi.fn();

const isPersistenceEnabledMock = vi.fn(() => false);
const getCurrentUserMock = vi.fn(async () => null);

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  isPersistenceEnabled: (...args: unknown[]) => isPersistenceEnabledMock(...args),
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

vi.mock("@/lib/persistence/repositories/appUserRepository", () => ({
  ensureDevAppUser: vi.fn(async () => "dev-user"),
}));

vi.mock("@/lib/trading/tradingService", () => ({
  isTradingConfigured: vi.fn(() => true),
  getTradingService: vi.fn(() => ({
    listPlaybookInstances: mockListPlaybookInstances,
    detachPlaybookInstance: mockDetachPlaybookInstance,
    pausePlaybookInstance: mockPausePlaybookInstance,
    resumePlaybookInstance: mockResumePlaybookInstance,
    skipNextPlaybookRule: mockSkipNextPlaybookRule,
  })),
}));

describe("/api/trading/playbooks routes", () => {
  beforeEach(() => {
    mockListPlaybookInstances.mockReset();
    mockDetachPlaybookInstance.mockReset();
    mockPausePlaybookInstance.mockReset();
    mockResumePlaybookInstance.mockReset();
    mockSkipNextPlaybookRule.mockReset();
    isPersistenceEnabledMock.mockReturnValue(false);
    getCurrentUserMock.mockResolvedValue(null);
  });

  it("GET /playbooks lists instances for account", async () => {
    mockListPlaybookInstances.mockResolvedValue([
      {
        id: "inst-1",
        templateId: "break_even",
        status: "pending_fill",
      },
    ]);

    const res = await getPlaybooks(
      new Request("http://localhost/api/trading/playbooks?accountId=DUP586813"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.instances).toHaveLength(1);
    expect(mockListPlaybookInstances).toHaveBeenCalledWith("DUP586813", { activeOnly: true });
  });

  it("POST /playbooks/:id/detach marks instance detached", async () => {
    mockDetachPlaybookInstance.mockResolvedValue({
      id: "inst-1",
      status: "detached",
    });

    const res = await detachPlaybook(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "inst-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.instance.status).toBe("detached");
  });

  it("POST /playbooks/:id/pause marks instance paused", async () => {
    mockPausePlaybookInstance.mockResolvedValue({ id: "inst-1", status: "paused" });
    const res = await pausePlaybook(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "inst-1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).instance.status).toBe("paused");
  });

  it("POST /playbooks/:id/resume marks instance armed", async () => {
    mockResumePlaybookInstance.mockResolvedValue({ id: "inst-1", status: "armed" });
    const res = await resumePlaybook(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "inst-1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).instance.status).toBe("armed");
  });

  it("POST /playbooks/:id/skip skips next rule", async () => {
    mockSkipNextPlaybookRule.mockResolvedValue({
      id: "inst-1",
      status: "armed",
      ruleRuntimes: [{ ruleId: "be-at-1r", status: "skipped" }],
    });
    const res = await skipPlaybook(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "inst-1" }),
    });
    expect(res.status).toBe(200);
    expect(mockSkipNextPlaybookRule).toHaveBeenCalledWith("inst-1");
  });
});
