import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMarketResearchNote: vi.fn(),
}));

vi.mock("@/lib/persistence/server/routeHelpers", () => ({
  withPersistenceAuth: (handler: (userId: string) => Promise<Response>) =>
    handler("user-1"),
}));

vi.mock("@/lib/persistence/repositories/marketResearchNotesRepository", () => ({
  createMarketResearchNote: mocks.createMarketResearchNote,
  listMarketResearchNotes: vi.fn(async () => []),
}));

import { PersistenceOwnershipError } from "@/lib/persistence/common";
import { POST } from "@/app/api/me/market-research-notes/route";

describe("POST /api/me/market-research-notes ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when chart workspace is not owned", async () => {
    mocks.createMarketResearchNote.mockRejectedValueOnce(
      new PersistenceOwnershipError("Chart workspace not found or not owned by the user."),
    );

    const response = await POST(
      new Request("http://localhost/api/me/market-research-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "AAPL",
          chartInterval: "1d",
          researchNoteType: "thesis",
          chartWorkspaceId: "ws-foreign",
          researchThesis: { summary: "test" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("validation");
  });
});
