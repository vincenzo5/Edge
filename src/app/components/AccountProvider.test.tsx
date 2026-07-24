import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRADING_ENVIRONMENT_KEY } from "@/lib/trading/tradingEnvironment";
import { AccountProvider } from "./AccountProvider";

describe("AccountProvider visibility polling", () => {
  beforeEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: { connected: true },
          summary: null,
          positions: [],
          pnl: null,
          orders: [],
          executions: [],
        }),
      ),
    );
  });

  it("skips live snapshot polling while hidden", async () => {
    render(
      <AccountProvider>
        <div data-testid="account-child" />
      </AccountProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    const callsAfterMount = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterMount);
    vi.useRealTimers();
  });
});
