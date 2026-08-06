import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_POLICY_BY_SIDE_KEY,
  parseDefaultPolicyBySide,
  readDefaultPolicyBySide,
  readDefaultPolicyForSide,
  recordDefaultPolicyForSide,
  writeDefaultPolicyBySide,
} from "./defaultPolicyPreference";

describe("defaultPolicyPreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("parseDefaultPolicyBySide accepts long and short ids", () => {
    expect(
      parseDefaultPolicyBySide(JSON.stringify({ long: "user_long", short: "user_short" })),
    ).toEqual({ long: "user_long", short: "user_short" });
  });

  it("recordDefaultPolicyForSide updates one side without clobbering the other", () => {
    recordDefaultPolicyForSide("BUY", "user_long");
    recordDefaultPolicyForSide("SELL", "user_short");
    recordDefaultPolicyForSide("BUY", "user_other");
    expect(readDefaultPolicyBySide()).toEqual({
      long: "user_other",
      short: "user_short",
    });
  });

  it("recordDefaultPolicyForSide clears side when template id is null", () => {
    writeDefaultPolicyBySide({ long: "user_long", short: "user_short" });
    recordDefaultPolicyForSide("BUY", null);
    expect(readDefaultPolicyForSide("BUY")).toBeUndefined();
    expect(readDefaultPolicyForSide("SELL")).toBe("user_short");
  });

  it("persists to localStorage under the v1 key", () => {
    recordDefaultPolicyForSide("BUY", "user_long");
    expect(localStorage.getItem(DEFAULT_POLICY_BY_SIDE_KEY)).toBe(
      JSON.stringify({ long: "user_long" }),
    );
  });
});
