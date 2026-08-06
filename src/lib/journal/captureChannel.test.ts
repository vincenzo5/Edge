/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  CHANNEL_NAME,
  STORAGE_KEY,
  parseCaptureChannelMessage,
  publishCaptureCancelled,
  publishCaptureDone,
  publishCaptureFailed,
  subscribeCaptureChannel,
} from "./captureChannel";

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

describe("captureChannel", () => {
  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    window.localStorage.clear();
    Object.defineProperty(window, "opener", { configurable: true, value: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses captureDone messages", () => {
    expect(
      parseCaptureChannelMessage({
        type: "captureDone",
        requestId: "req-1",
        tradeId: "trade-1",
        screenshotId: "shot-1",
        snapshotId: "snap-1",
      }),
    ).toEqual({
      type: "captureDone",
      requestId: "req-1",
      tradeId: "trade-1",
      screenshotId: "shot-1",
      snapshotId: "snap-1",
    });
  });

  it("rejects malformed messages", () => {
    expect(parseCaptureChannelMessage(null)).toBeNull();
    expect(parseCaptureChannelMessage({ type: "captureDone" })).toBeNull();
    expect(parseCaptureChannelMessage({ type: "unknown" })).toBeNull();
  });

  it("publishes and subscribes to captureDone", () => {
    const handler = vi.fn();
    subscribeCaptureChannel(handler);

    publishCaptureDone({
      requestId: "req-1",
      tradeId: "trade-1",
      screenshotId: "shot-1",
      snapshotId: "snap-1",
    });

    expect(handler).toHaveBeenCalledWith({
      type: "captureDone",
      requestId: "req-1",
      tradeId: "trade-1",
      screenshotId: "shot-1",
      snapshotId: "snap-1",
    });
  });

  it("publishes cancelled and failed messages", () => {
    const handler = vi.fn();
    const subscriber = new MockBroadcastChannel(CHANNEL_NAME);
    subscriber.addEventListener("message", (event) => {
      const parsed = parseCaptureChannelMessage(event.data);
      if (parsed) handler(parsed);
    });

    publishCaptureCancelled({ requestId: "req-1", tradeId: "trade-1" });
    publishCaptureFailed({ requestId: "req-2", tradeId: "trade-1", error: "Failed" });

    expect(handler).toHaveBeenCalledWith({
      type: "captureCancelled",
      requestId: "req-1",
      tradeId: "trade-1",
    });
    expect(handler).toHaveBeenCalledWith({
      type: "captureFailed",
      requestId: "req-2",
      tradeId: "trade-1",
      error: "Failed",
    });

    subscriber.close();
  });

  it("publishes to the opener when BroadcastChannel is unavailable", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const postMessage = vi.fn();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });

    publishCaptureDone({
      requestId: "req-1",
      tradeId: "trade-1",
      screenshotId: "shot-1",
      snapshotId: "snap-1",
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "captureDone", requestId: "req-1" }),
      window.location.origin,
    );
  });

  it("subscribes through the storage event fallback", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const handler = vi.fn();
    const unsubscribe = subscribeCaptureChannel(handler);
    const message = {
      type: "captureDone",
      requestId: "req-storage",
      tradeId: "trade-1",
      screenshotId: "shot-1",
      snapshotId: "snap-1",
    };

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify({ message, nonce: "unique" }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(message);
    unsubscribe();
  });
});
