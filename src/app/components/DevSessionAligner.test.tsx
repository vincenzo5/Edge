import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { DevSessionAligner } from "./DevSessionAligner";

const reloadMock = vi.fn();

describe("DevSessionAligner", () => {
  beforeEach(() => {
    reloadMock.mockReset();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("realigns session when configured dev email differs from cookie user", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          persistenceEnabled: true,
          configuredDevEmail: "demo@localhost",
          user: { email: "dev@localhost" },
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { email: "demo@localhost" } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<DevSessionAligner />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/dev-session", { method: "DELETE" });
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  it("does nothing when session already matches configured dev email", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        persistenceEnabled: true,
        configuredDevEmail: "demo@localhost",
        user: { email: "demo@localhost" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DevSessionAligner />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
