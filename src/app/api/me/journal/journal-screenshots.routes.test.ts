import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/persistence/server/routeHelpers", () => ({
  withPersistenceAuth: (handler: (userId: string) => Promise<Response>) =>
    handler("user-1"),
}));

const listJournalTradeScreenshots = vi.fn(async () => []);
const createJournalTradeScreenshot = vi.fn(async () => ({
  id: "shot-1",
  tradeId: "trade-1",
  sortIndex: 0,
  caption: null,
  mimeType: "image/png" as const,
  byteSize: 4,
  width: null,
  height: null,
  source: "upload" as const,
  createdAt: "2026-07-20T12:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
}));
const deleteJournalTradeScreenshot = vi.fn(async () => true);

vi.mock("@/lib/persistence/repositories/journalScreenshotRepository", () => ({
  listJournalTradeScreenshots,
  createJournalTradeScreenshot,
  deleteJournalTradeScreenshot,
  patchJournalTradeScreenshot: vi.fn(),
  readJournalTradeScreenshotBytes: vi.fn(),
}));

describe("journal screenshot API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /journal/trades/:id/screenshots returns list", async () => {
    const { GET } = await import(
      "@/app/api/me/journal/trades/[id]/screenshots/route"
    );
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "trade-1" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.screenshots).toEqual([]);
  });

  it("POST /journal/trades/:id/screenshots rejects missing file", async () => {
    const { POST } = await import(
      "@/app/api/me/journal/trades/[id]/screenshots/route"
    );
    const form = new FormData();
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ id: "trade-1" }) },
    );
    expect(response.status).toBe(400);
  });

  it("POST /journal/trades/:id/screenshots rejects non-multipart requests", async () => {
    const { POST } = await import(
      "@/app/api/me/journal/trades/[id]/screenshots/route"
    );
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "trade-1" }) },
    );
    expect(response.status).toBe(400);
  });

  it("lets database-unavailable errors reach the persistence fallback boundary", async () => {
    createJournalTradeScreenshot.mockRejectedValueOnce(new Error("Failed query: insert screenshot"));
    const { POST } = await import(
      "@/app/api/me/journal/trades/[id]/screenshots/route"
    );
    const request = {
      headers: new Headers({ "Content-Type": "multipart/form-data; boundary=test" }),
      formData: async () => ({
        get: (field: string) =>
          field === "file"
            ? {
                type: "image/png",
                arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
              }
            : null,
      }),
    } as unknown as Request;

    await expect(
      POST(request, { params: Promise.resolve({ id: "trade-1" }) }),
    ).rejects.toThrow("Failed query");
  });

  it("DELETE /journal/trades/:id/screenshots/:shotId removes screenshot", async () => {
    const { DELETE } = await import(
      "@/app/api/me/journal/trades/[id]/screenshots/[shotId]/route"
    );
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "trade-1", shotId: "shot-1" }),
    });
    expect(response.status).toBe(200);
    expect(deleteJournalTradeScreenshot).toHaveBeenCalledWith("user-1", "trade-1", "shot-1");
  });
});
