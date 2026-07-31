import { describe, expect, it, beforeEach } from "vitest";

import {
  LAST_USED_POLICY_BY_SIDE_KEY,
  parseLastUsedPolicyBySide,
  readLastUsedPolicyBySide,
  readLastUsedPolicyForSide,
  recordLastUsedPolicy,
  writeLastUsedPolicyBySide,
} from "./lastUsedPreference";

describe("lastUsedPreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("parseLastUsedPolicyBySide handles empty and invalid input", () => {
    expect(parseLastUsedPolicyBySide(null)).toEqual({});
    expect(parseLastUsedPolicyBySide("not-json")).toEqual({});
    expect(parseLastUsedPolicyBySide('{"long":"break_even"}')).toEqual({
      long: "break_even",
    });
  });

  it("read/write round-trips by side", () => {
    writeLastUsedPolicyBySide({ long: "half_then_be", short: "break_even" });
    expect(readLastUsedPolicyBySide()).toEqual({
      long: "half_then_be",
      short: "break_even",
    });
    expect(readLastUsedPolicyForSide("BUY")).toBe("half_then_be");
    expect(readLastUsedPolicyForSide("SELL")).toBe("break_even");
  });

  it("recordLastUsedPolicy updates one side without clobbering the other", () => {
    recordLastUsedPolicy("BUY", "scale_3x");
    recordLastUsedPolicy("SELL", "daytrade_flatten");
    recordLastUsedPolicy("BUY", "half_plus_trail");

    expect(readLastUsedPolicyForSide("BUY")).toBe("half_plus_trail");
    expect(readLastUsedPolicyForSide("SELL")).toBe("daytrade_flatten");
    expect(window.localStorage.getItem(LAST_USED_POLICY_BY_SIDE_KEY)).toContain(
      "half_plus_trail",
    );
  });
});
