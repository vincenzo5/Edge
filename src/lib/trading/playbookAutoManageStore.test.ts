import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLAYBOOK_AUTO_MANAGE,
  PatchPlaybookAutoManageSchema,
  createMemoryPlaybookAutoManageStore,
  isAutoManageEnabledForEnvironment,
  mergePlaybookAutoManagePatch,
  resolvePlaybookLiveConfirmation,
} from "./playbookAutoManageStore";

describe("playbookAutoManageStore", () => {
  it("defaults paper on and live off", () => {
    expect(DEFAULT_PLAYBOOK_AUTO_MANAGE).toEqual({
      paperEnabled: true,
      liveEnabled: false,
    });
  });

  it("requires LIVE token to enable live", () => {
    const parsed = PatchPlaybookAutoManageSchema.safeParse({
      liveEnabled: true,
      liveConfirmation: "NOPE",
    });
    expect(parsed.success).toBe(false);
  });

  it("records live consent when enabled with LIVE", () => {
    const next = mergePlaybookAutoManagePatch(DEFAULT_PLAYBOOK_AUTO_MANAGE, {
      liveEnabled: true,
      liveConfirmation: "LIVE",
    });
    expect(next.liveEnabled).toBe(true);
    expect(next.liveConsentAt).toBeDefined();
  });

  it("clears live consent when disabled", () => {
    const enabled = mergePlaybookAutoManagePatch(DEFAULT_PLAYBOOK_AUTO_MANAGE, {
      liveEnabled: true,
      liveConfirmation: "LIVE",
    });
    const disabled = mergePlaybookAutoManagePatch(enabled, { liveEnabled: false });
    expect(disabled.liveEnabled).toBe(false);
    expect(disabled.liveConsentAt).toBeUndefined();
  });

  it("gates environments for evaluator", () => {
    const settings = createMemoryPlaybookAutoManageStore();
    expect(isAutoManageEnabledForEnvironment(DEFAULT_PLAYBOOK_AUTO_MANAGE, "paper")).toBe(true);
    expect(isAutoManageEnabledForEnvironment(DEFAULT_PLAYBOOK_AUTO_MANAGE, "live")).toBe(false);
    return settings.patch({ liveEnabled: true, liveConfirmation: "LIVE" }).then((next) => {
      expect(isAutoManageEnabledForEnvironment(next, "live")).toBe(true);
      expect(resolvePlaybookLiveConfirmation(next, "live")).toBe("LIVE");
    });
  });
});
