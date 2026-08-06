import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  consumePendingPositionPlacementOptions,
  resetPendingPositionPlacementOptions,
} from "@edge/chart-core";
import { writeDefaultPolicyBySide } from "@/lib/risk/policy/defaultPolicyPreference";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import {
  clearPlaybookTemplateCache,
  setCachedPlaybookTemplates,
} from "@/lib/trading/playbookTemplateCache";
import {
  armPositionPlacementFromDefaultPolicySync,
  isPositionDrawingTool,
} from "./armPositionPlacement";

const oneRPolicy: PlaybookTemplate = {
  id: "user_one_r",
  name: "Long half → BE → 0.5R trail",
  description: "",
  rules: [],
  geometry: {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  },
};

describe("armPositionPlacement", () => {
  beforeEach(() => {
    localStorage.clear();
    clearPlaybookTemplateCache();
    resetPendingPositionPlacementOptions();
    setCachedPlaybookTemplates([oneRPolicy]);
    writeDefaultPolicyBySide({ long: "user_one_r", short: "user_one_r" });
  });

  afterEach(() => {
    localStorage.clear();
    clearPlaybookTemplateCache();
    resetPendingPositionPlacementOptions();
  });

  it("recognizes toolbar aliases longPosition / shortPosition", () => {
    expect(isPositionDrawingTool("longPosition")).toBe(true);
    expect(isPositionDrawingTool("shortPosition")).toBe(true);
    expect(isPositionDrawingTool("long_position")).toBe(true);
    expect(isPositionDrawingTool("trend_line")).toBe(false);
  });

  it("arms 1R target from default policy for toolbar longPosition", () => {
    armPositionPlacementFromDefaultPolicySync("longPosition");
    expect(consumePendingPositionPlacementOptions()).toEqual({ targetRMultiple: 1 });
  });

  it("arms 1R target from default policy for toolbar shortPosition", () => {
    armPositionPlacementFromDefaultPolicySync("shortPosition");
    expect(consumePendingPositionPlacementOptions()).toEqual({ targetRMultiple: 1 });
  });
});
