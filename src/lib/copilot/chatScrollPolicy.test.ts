import { describe, expect, it } from "vitest";

import { isNearBottom, NEAR_BOTTOM_THRESHOLD_PX } from "./chatScrollPolicy";

function mockScrollElement(options: {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}): HTMLElement {
  return {
    scrollHeight: options.scrollHeight,
    scrollTop: options.scrollTop,
    clientHeight: options.clientHeight,
  } as HTMLElement;
}

describe("chatScrollPolicy", () => {
  it("exports the frozen near-bottom threshold", () => {
    expect(NEAR_BOTTOM_THRESHOLD_PX).toBe(96);
  });

  it("returns true when within threshold of bottom", () => {
    const element = mockScrollElement({
      scrollHeight: 1000,
      scrollTop: 904,
      clientHeight: 96,
    });
    expect(isNearBottom(element)).toBe(true);
  });

  it("returns false when scrolled away from bottom", () => {
    const element = mockScrollElement({
      scrollHeight: 1000,
      scrollTop: 400,
      clientHeight: 96,
    });
    expect(isNearBottom(element)).toBe(false);
  });

  it("accepts a custom threshold", () => {
    const element = mockScrollElement({
      scrollHeight: 500,
      scrollTop: 300,
      clientHeight: 100,
    });
    // distance from bottom = 500 - 300 - 100 = 100
    expect(isNearBottom(element, 60)).toBe(false);
    expect(isNearBottom(element, 120)).toBe(true);
  });
});
