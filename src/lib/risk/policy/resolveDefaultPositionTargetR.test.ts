import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveDefaultPositionTargetR } from "./resolveDefaultPositionTargetR";
import { writeDefaultPolicyBySide } from "./defaultPolicyPreference";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";

const oneRPolicy: PlaybookTemplate = {
  id: "user_one_r",
  name: "1R",
  description: "",
  rules: [],
  geometry: {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  },
};

describe("resolveDefaultPositionTargetR", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns 2 when no default policy is set", () => {
    expect(
      resolveDefaultPositionTargetR({ side: "BUY", templates: [oneRPolicy] }),
    ).toBe(2);
  });

  it("reads target R from default long policy geometry", () => {
    writeDefaultPolicyBySide({ long: "user_one_r" });
    expect(
      resolveDefaultPositionTargetR({ side: "BUY", templates: [oneRPolicy] }),
    ).toBe(1);
  });

  it("falls back to 2 when default template id is missing from library", () => {
    writeDefaultPolicyBySide({ short: "user_missing" });
    expect(
      resolveDefaultPositionTargetR({ side: "SELL", templates: [oneRPolicy] }),
    ).toBe(2);
  });
});
