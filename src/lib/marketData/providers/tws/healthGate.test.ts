import { describe, it, expect, beforeEach } from "vitest";
import {
  TwsHealthGate,
  TwsRequestError,
  classifyTwsError,
  resetTwsHealthGateForTests,
  twsHealthGate,
} from "./healthGate";

describe("TwsHealthGate", () => {
  beforeEach(() => {
    resetTwsHealthGateForTests();
  });

  it("allows TWS attempts when healthy", () => {
    expect(twsHealthGate.shouldTryTws("candles")).toBe(true);
  });

  it("opens circuit on timeout failures", () => {
    twsHealthGate.recordFailure("request_timeout");
    expect(twsHealthGate.shouldTryTws("candles")).toBe(false);
    expect(twsHealthGate.getSkipReason()).toMatch(/request_timeout/);
  });

  it("does not open circuit on provider_empty", () => {
    twsHealthGate.recordFailure("provider_empty");
    expect(twsHealthGate.shouldTryTws("candles")).toBe(true);
  });

  it("clears circuit on success", () => {
    twsHealthGate.recordFailure("gateway_disconnected");
    twsHealthGate.recordSuccess();
    expect(twsHealthGate.shouldTryTws("quotes")).toBe(true);
    expect(twsHealthGate.getSkipReason()).toBeNull();
  });

  it("classifies timeout and gateway errors", () => {
    expect(classifyTwsError(new TwsRequestError("request_timeout", "timed out"))).toBe(
      "request_timeout",
    );
    expect(classifyTwsError(new Error("Unable to connect to IB Gateway"))).toBe(
      "gateway_disconnected",
    );
    expect(classifyTwsError(new Error("fetch failed ECONNREFUSED"))).toBe("sidecar_unreachable");
  });

  it("resets state for tests", () => {
    const gate = new TwsHealthGate();
    gate.recordFailure("provider_error");
    gate.reset();
    expect(gate.shouldTryTws()).toBe(true);
  });
});
