import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRADING_ENVIRONMENT_KEY } from "@/lib/trading/tradingEnvironment";
import { AccountProvider } from "./AccountProvider";

const snapshotPayload = {
  status: { connected: true },
  summary: null,
  positions: [],
  pnl: null,
  orders: [],
  executions: [],
};

type FetchHandlers = {
  config?: () => Response | Promise<Response>;
  health?: () => Response | Promise<Response>;
  snapshot?: () => Response | Promise<Response>;
};

function mockAccountFetch(handlers: FetchHandlers) {
  const config = handlers.config ?? (() => Response.json({ environmentLock: null }));
  const health =
    handlers.health ??
    (() =>
      Response.json({
        health: { generatedAt: Date.now(), providers: [{ id: "tws", circuitOpen: false }] },
      }));
  const snapshot = handlers.snapshot ?? (() => Response.json(snapshotPayload));

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/trading/config")) return config();
      if (url.includes("/api/market-data/health")) return health();
      if (url.includes("/api/brokerage/snapshot")) return snapshot();
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

describe("AccountProvider visibility polling", () => {
  beforeEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    class MockEventSource {
      close = vi.fn();
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_url: string) {}
    }
    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubGlobal("localStorage", {
      store: { [TRADING_ENVIRONMENT_KEY]: "live" } as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("skips live snapshot polling while hidden", async () => {
    mockAccountFetch({});

    render(
      <AccountProvider>
        <div data-testid="account-child" />
      </AccountProvider>,
    );

    await waitFor(() => {
      const snapshotCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([url]) => String(url).includes("/api/brokerage/snapshot"),
      );
      expect(snapshotCalls.length).toBeGreaterThan(0);
    });

    const snapshotCallsAfterMount = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]) => String(url).includes("/api/brokerage/snapshot"),
    ).length;

    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    const snapshotCallsAfterHidden = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]) => String(url).includes("/api/brokerage/snapshot"),
    ).length;
    expect(snapshotCallsAfterHidden).toBe(snapshotCallsAfterMount);
  });

  it("uses paper snapshot when config locks environment to paper", async () => {
    mockAccountFetch({
      config: () => Response.json({ environmentLock: "paper" }),
    });

    render(
      <AccountProvider>
        <div />
      </AccountProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/brokerage/snapshot?environment=paper"),
        expect.any(Object),
      );
    });

    const snapshotCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]) => String(url).includes("/api/brokerage/snapshot"),
    );
    expect(snapshotCalls.some(([url]) => String(url).includes("environment=live"))).toBe(false);
  });

  it("does not re-probe snapshot while TWS circuit is open", async () => {
    mockAccountFetch({
      health: () =>
        Response.json({
          health: {
            generatedAt: Date.now(),
            providers: [{ id: "tws", circuitOpen: true }],
          },
        }),
      snapshot: () => Response.json({ error: "sidecar down" }, { status: 503 }),
    });

    render(
      <AccountProvider>
        <div />
      </AccountProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/market-data/health"),
        expect.any(Object),
      );
    });

    const snapshotCallsAfterInitial = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]) => String(url).includes("/api/brokerage/snapshot"),
    ).length;
    expect(snapshotCallsAfterInitial).toBe(0);

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    const snapshotCallsAfterWait = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]) => String(url).includes("/api/brokerage/snapshot"),
    ).length;
    expect(snapshotCallsAfterWait).toBe(0);
  });

  it("pauses re-probe after environment lock 403", async () => {
    mockAccountFetch({
      snapshot: () => Response.json({ error: "locked" }, { status: 403 }),
    });

    render(
      <AccountProvider>
        <div />
      </AccountProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/brokerage/snapshot"),
        expect.any(Object),
      );
    });

    const snapshotCallsAfter403 = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]) => String(url).includes("/api/brokerage/snapshot"),
    ).length;

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    const snapshotCallsAfterWait = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]) => String(url).includes("/api/brokerage/snapshot"),
    ).length;
    expect(snapshotCallsAfterWait).toBe(snapshotCallsAfter403);
  });
});
