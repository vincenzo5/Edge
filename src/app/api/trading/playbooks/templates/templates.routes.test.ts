import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getTemplates, POST as createTemplate } from "@/app/api/trading/playbooks/templates/route";
import { PATCH as patchTemplate, DELETE as deleteTemplate } from "@/app/api/trading/playbooks/templates/[id]/route";
import { POST as duplicateTemplate } from "@/app/api/trading/playbooks/templates/[id]/duplicate/route";

const mockListPlaybookTemplates = vi.fn();
const mockCreatePlaybookTemplate = vi.fn();
const mockPatchPlaybookTemplate = vi.fn();
const mockDuplicatePlaybookTemplate = vi.fn();
const mockDeletePlaybookTemplate = vi.fn();

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
    listPlaybookTemplates: mockListPlaybookTemplates,
    createPlaybookTemplate: mockCreatePlaybookTemplate,
    patchPlaybookTemplate: mockPatchPlaybookTemplate,
    duplicatePlaybookTemplate: mockDuplicatePlaybookTemplate,
    deletePlaybookTemplate: mockDeletePlaybookTemplate,
  })),
}));

describe("/api/trading/playbooks/templates routes", () => {
  beforeEach(() => {
    mockListPlaybookTemplates.mockReset();
    mockCreatePlaybookTemplate.mockReset();
    mockPatchPlaybookTemplate.mockReset();
    mockDuplicatePlaybookTemplate.mockReset();
    mockDeletePlaybookTemplate.mockReset();
    isPersistenceEnabledMock.mockReturnValue(false);
    getCurrentUserMock.mockResolvedValue(null);
  });

  it("GET lists presets and user templates", async () => {
    mockListPlaybookTemplates.mockResolvedValue([
      { id: "user_abc", name: "My BE", description: "x", rules: [] },
    ]);

    const res = await getTemplates(new Request("http://localhost/api/trading/playbooks/templates"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.presets.length).toBeGreaterThan(0);
    expect(body.userTemplates).toHaveLength(1);
  });

  it("POST creates user template from preset", async () => {
    mockCreatePlaybookTemplate.mockResolvedValue({
      id: "user_new",
      name: "Copy",
      description: "desc",
      rules: [{ id: "r1", when: { kind: "multipleOfR", multiple: 1 }, then: { kind: "flatten" } }],
    });

    const res = await createTemplate(
      new Request("http://localhost/api/trading/playbooks/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTemplateId: "break_even", name: "Copy" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(mockCreatePlaybookTemplate).toHaveBeenCalled();
  });

  it("PATCH renames user template", async () => {
    mockPatchPlaybookTemplate.mockResolvedValue({
      id: "user_abc",
      name: "Renamed",
      description: "x",
      rules: [],
    });

    const res = await patchTemplate(
      new Request("http://localhost/api/trading/playbooks/templates/user_abc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ id: "user_abc" }) },
    );
    expect(res.status).toBe(200);
  });

  it("PATCH updates user template rules", async () => {
    const rules = [
      {
        id: "custom-be",
        when: { kind: "multipleOfR", multiple: 1 },
        then: { kind: "modifyStop", breakEven: true },
        once: true,
      },
    ];
    mockPatchPlaybookTemplate.mockResolvedValue({
      id: "user_abc",
      name: "Custom",
      description: "x",
      rules,
    });

    const res = await patchTemplate(
      new Request("http://localhost/api/trading/playbooks/templates/user_abc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      }),
      { params: Promise.resolve({ id: "user_abc" }) },
    );
    expect(res.status).toBe(200);
    expect(mockPatchPlaybookTemplate).toHaveBeenCalledWith("user_abc", { rules });
  });

  it("POST duplicate clones template", async () => {
    mockDuplicatePlaybookTemplate.mockResolvedValue({
      id: "user_copy",
      name: "Break-even (copy)",
      description: "x",
      rules: [],
    });

    const res = await duplicateTemplate(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "break_even" }),
    });
    expect(res.status).toBe(201);
  });

  it("DELETE removes user template", async () => {
    mockDeletePlaybookTemplate.mockResolvedValue(true);

    const res = await deleteTemplate(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "user_abc" }),
    });
    expect(res.status).toBe(200);
  });
});
