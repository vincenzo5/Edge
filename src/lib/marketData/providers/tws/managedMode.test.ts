import { describe, expect, it, afterEach } from "vitest";
import {
  canNextSpawnSidecar,
  getTwsManagedMode,
  isTwsExternalManaged,
  isTwsLocalManaged,
} from "./managedMode";

describe("managedMode", () => {
  afterEach(() => {
    delete process.env.TWS_ENABLED;
    delete process.env.TWS_MANAGED;
  });

  it("returns null when TWS is disabled", () => {
    process.env.TWS_ENABLED = "false";
    expect(getTwsManagedMode()).toBeNull();
    expect(canNextSpawnSidecar()).toBe(false);
  });

  it("defaults to local when TWS enabled and TWS_MANAGED unset", () => {
    process.env.TWS_ENABLED = "true";
    expect(getTwsManagedMode()).toBe("local");
    expect(isTwsLocalManaged()).toBe(true);
    expect(canNextSpawnSidecar()).toBe(true);
  });

  it("returns external when TWS_MANAGED=external", () => {
    process.env.TWS_ENABLED = "true";
    process.env.TWS_MANAGED = "external";
    expect(getTwsManagedMode()).toBe("external");
    expect(isTwsExternalManaged()).toBe(true);
    expect(canNextSpawnSidecar()).toBe(false);
  });
});
