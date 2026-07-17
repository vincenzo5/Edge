/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ScreenerDriveListener } from "./ScreenerDriveListener";
import { ChartActionsProvider } from "../ChartActionsContext";
import { CHANNEL_NAME } from "@/lib/screener/reviewChannel";

type MessageListener = (event: MessageEvent) => void;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  private listeners = new Set<MessageListener>();
  private closed = false;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    if (this.closed) return;
    const event = { data } as MessageEvent;
    for (const channel of MockBroadcastChannel.instances) {
      if (channel.name !== this.name || channel.closed) continue;
      for (const listener of channel.listeners) {
        listener(event);
      }
    }
  }

  addEventListener(type: string, listener: MessageListener) {
    if (type === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: MessageListener) {
    if (type === "message") {
      this.listeners.delete(listener);
    }
  }

  close() {
    this.closed = true;
    const index = MockBroadcastChannel.instances.indexOf(this);
    if (index >= 0) {
      MockBroadcastChannel.instances.splice(index, 1);
    }
  }
}

describe("ScreenerDriveListener", () => {
  const loadSymbolIntoActiveChart = vi.fn();

  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    loadSymbolIntoActiveChart.mockClear();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderListener() {
    return render(
      <ChartActionsProvider
        activeCellSymbol="AAPL"
        loadSymbolIntoActiveChart={loadSymbolIntoActiveChart}
      >
        <ScreenerDriveListener />
      </ChartActionsProvider>,
    );
  }

  it("publishes chartReady on mount", async () => {
    const handler = vi.fn();
    const subscriber = new MockBroadcastChannel(CHANNEL_NAME);
    subscriber.addEventListener("message", handler);

    renderListener();

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ data: { type: "chartReady" } }),
      );
    });

    subscriber.close();
  });

  it("loads the active chart when setSymbol is received", async () => {
    renderListener();

    const publisher = new MockBroadcastChannel(CHANNEL_NAME);
    publisher.postMessage({
      type: "setSymbol",
      symbol: "NVDA",
      name: "NVIDIA",
      exchange: "NASDAQ",
      source: "screener",
      ts: Date.now(),
    });

    await waitFor(() => {
      expect(loadSymbolIntoActiveChart).toHaveBeenCalledWith({
        symbol: "NVDA",
        name: "NVIDIA",
        exchange: "NASDAQ",
      });
    });

    publisher.close();
  });
});
