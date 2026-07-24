import { describe, expect, it } from "vitest";

import { createDefaultScreenerSession } from "./screenerSession";
import { DEFAULT_SCREENER_STATE } from "./screenStorage";
import {
  applyReviewResumeToSession,
  buildReviewResumeFromSession,
  clearReviewResume,
  computeScreenerQueryFingerprint,
  isReviewResumeValid,
  sanitizeReviewResumeOnLoad,
  syncReviewResumeOntoState,
} from "./reviewResume";

describe("reviewResume", () => {
  it("computes a stable query fingerprint", () => {
    const fingerprint = computeScreenerQueryFingerprint(DEFAULT_SCREENER_STATE);
    expect(fingerprint).toContain('"activeScreenId":null');
    expect(
      computeScreenerQueryFingerprint({
        ...DEFAULT_SCREENER_STATE,
        activeScreenId: "screen-1",
      }),
    ).not.toBe(fingerprint);
  });

  it("builds and applies review resume when review is active", () => {
    const session = {
      ...createDefaultScreenerSession(DEFAULT_SCREENER_STATE),
      reviewIndex: 2,
      keepers: ["AAPL", "MSFT"],
      reviewActive: true,
    };
    const resume = buildReviewResumeFromSession(DEFAULT_SCREENER_STATE, session);
    expect(resume).toMatchObject({
      reviewIndex: 2,
      keepers: ["AAPL", "MSFT"],
      reviewActive: true,
    });

    const state = { ...DEFAULT_SCREENER_STATE, reviewResume: resume };
    expect(isReviewResumeValid(state)).toBe(true);
    const restored = applyReviewResumeToSession(state, createDefaultScreenerSession(state));
    expect(restored.reviewIndex).toBe(2);
    expect(restored.keepers).toEqual(["AAPL", "MSFT"]);
    expect(restored.reviewActive).toBe(true);
  });

  it("clears stale resume when fingerprint no longer matches", () => {
    const stale = {
      reviewIndex: 1,
      keepers: ["AAPL"],
      reviewActive: true,
      queryFingerprint: "stale",
    };
    const sanitized = sanitizeReviewResumeOnLoad({
      ...DEFAULT_SCREENER_STATE,
      reviewResume: stale,
    });
    expect(sanitized.reviewResume).toBeNull();
  });

  it("syncs review resume onto state and clears when review ends", () => {
    const session = {
      reviewIndex: 1,
      keepers: ["NVDA"],
      reviewActive: true,
    };
    const synced = syncReviewResumeOntoState(DEFAULT_SCREENER_STATE, session);
    expect(synced.reviewResume?.keepers).toEqual(["NVDA"]);

    const cleared = syncReviewResumeOntoState(
      synced,
      { reviewIndex: 0, keepers: [], reviewActive: false },
    );
    expect(clearReviewResume(cleared).reviewResume).toBeNull();
  });
});
