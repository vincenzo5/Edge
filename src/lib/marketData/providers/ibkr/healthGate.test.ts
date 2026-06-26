import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyIbkrError,
  ibkrHealthGate,
  resetIbkrHealthGateForTests,
} from "./healthGate";

describe("ibkr healthGate", () => {
  beforeEach(() => {
    resetIbkrHealthGateForTests();
  });

  it("allows IBKR attempts when healthy", () => {
    expect(ibkrHealthGate.shouldTryIbkr("quotes")).toBe(true);
  });

  it("opens circuit after auth failure and skips subsequent attempts", () => {
    ibkrHealthGate.recordFailure("auth_failure");
    expect(ibkrHealthGate.shouldTryIbkr("quotes")).toBe(false);
    expect(ibkrHealthGate.getSkipReason()).toMatch(/auth_failure/);
  });

  it("classifies unauthorized errors as auth failures", () => {
    expect(classifyIbkrError(new Error("IBKR request failed (401) unauthorized"))).toBe(
      "auth_failure",
    );
  });
});
