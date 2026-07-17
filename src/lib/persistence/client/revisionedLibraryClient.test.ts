import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  persistenceFetch: vi.fn(),
}));

vi.mock("@/lib/persistence/client/persistenceFetch", () => ({
  persistenceFetch: mocks.persistenceFetch,
}));

import {
  fetchRevisionedLibrary,
  parseJsonResponse,
  saveRevisionedLibraryRemote,
} from "./revisionedLibraryClient";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("revisionedLibraryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseJsonResponse", () => {
    it("returns parsed JSON on success", async () => {
      const response = jsonResponse({ syncRevision: 1 });
      await expect(parseJsonResponse<{ syncRevision: number }>(response)).resolves.toEqual({
        syncRevision: 1,
      });
    });

    it("returns null on invalid JSON", async () => {
      const response = new Response("not-json", { status: 200 });
      await expect(parseJsonResponse(response)).resolves.toBeNull();
    });
  });

  describe("fetchRevisionedLibrary", () => {
    it("returns null when persistence is unavailable", async () => {
      mocks.persistenceFetch.mockResolvedValue(new Response(null, { status: 503 }));

      await expect(fetchRevisionedLibrary("/api/me/watchlist-library")).resolves.toBeNull();
    });

    it("returns null when response is not ok", async () => {
      mocks.persistenceFetch.mockResolvedValue(new Response(null, { status: 401 }));

      await expect(fetchRevisionedLibrary("/api/me/watchlist-library")).resolves.toBeNull();
    });

    it("returns parsed record on success", async () => {
      const record = { syncRevision: 2, updatedAt: "2026-01-01T00:00:00.000Z" };
      mocks.persistenceFetch.mockResolvedValue(jsonResponse(record));

      await expect(fetchRevisionedLibrary<typeof record>("/api/me/watchlist-library")).resolves.toEqual(
        record,
      );
      expect(mocks.persistenceFetch).toHaveBeenCalledWith("/api/me/watchlist-library", {
        method: "GET",
      });
    });
  });

  describe("saveRevisionedLibraryRemote", () => {
    it("returns record on success", async () => {
      const record = { syncRevision: 3, updatedAt: "2026-01-02T00:00:00.000Z" };
      mocks.persistenceFetch.mockResolvedValue(jsonResponse(record));

      await expect(
        saveRevisionedLibraryRemote("/api/me/watchlist-library", {
          schemaVersion: 1,
          baseRevision: 2,
          watchlistSnapshot: { items: [] },
        }),
      ).resolves.toEqual({ ok: true, record });
    });

    it("returns 500 when success body is invalid JSON", async () => {
      mocks.persistenceFetch.mockResolvedValue(new Response("bad", { status: 200 }));

      await expect(
        saveRevisionedLibraryRemote("/api/me/watchlist-library", {
          schemaVersion: 1,
          baseRevision: 2,
          watchlistSnapshot: { items: [] },
        }),
      ).resolves.toEqual({ ok: false, status: 500 });
    });

    it("returns conflict payload on failure", async () => {
      mocks.persistenceFetch.mockResolvedValue(
        jsonResponse(
          {
            code: "conflict",
            current: { syncRevision: 4, updatedAt: "2026-01-03T00:00:00.000Z" },
          },
          { status: 409 },
        ),
      );

      await expect(
        saveRevisionedLibraryRemote("/api/me/watchlist-library", {
          schemaVersion: 1,
          baseRevision: 2,
          watchlistSnapshot: { items: [] },
        }),
      ).resolves.toEqual({
        ok: false,
        status: 409,
        code: "conflict",
        current: { syncRevision: 4, updatedAt: "2026-01-03T00:00:00.000Z" },
      });
    });
  });
});
