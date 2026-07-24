import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { SEED_CONNECTIONS } from "./seedConnections";
import { useConnectionsList } from "./useConnectionsList";

describe("useConnectionsList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to seed connections when persistence is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 503,
        ok: false,
      }),
    );

    const { result } = renderHook(() => useConnectionsList());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connections).toEqual(SEED_CONNECTIONS);
    expect(result.current.source).toBe("seed");
  });

  it("loads remote connections when API succeeds", async () => {
    const remote = [
      {
        ...SEED_CONNECTIONS[0],
        displayName: "Custom Paper",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ connections: remote }),
      }),
    );

    const { result } = renderHook(() => useConnectionsList());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connections[0]?.displayName).toBe("Custom Paper");
    expect(result.current.source).toBe("remote");
  });
});
