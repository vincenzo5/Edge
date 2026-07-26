import { describe, expect, it, vi } from "vitest";

import {
  APP_PROD_CONTAINER_NAME,
  assertContainerLifecycleAllowed,
  assertLegacyProductionStartAllowed,
  collectPortOwnershipFacts,
  isContainerBoundPort3000,
  readContainerProductionFacts,
  unmanagedPort3000Listeners,
} from "./port-ownership.mts";

const FULL_SHA = "5aa83b921c51a7dadc625101076301ce765ac03d";

function mockExecFile(containerStatus: string | null): ReturnType<typeof vi.fn> {
  return vi.fn((file: string, args: string[]) => {
    if (file === "docker" && args[0] === "inspect") {
      if (containerStatus == null) throw new Error("No such object");
      const formatIndex = args.indexOf("--format");
      const format = formatIndex >= 0 ? args[formatIndex + 1] : "";
      if (format.includes("State.Status")) return containerStatus;
      if (format.includes("State.Health")) return containerStatus === "running" ? "healthy" : "";
      if (format.includes("Config.Image")) return `edge-app:${FULL_SHA}`;
    }
    if (file === "launchctl" && args[0] === "print") return "state = running";
    return "";
  });
}

describe("readContainerProductionFacts", () => {
  it("returns running facts when container is healthy", () => {
    const facts = readContainerProductionFacts(mockExecFile("running"), APP_PROD_CONTAINER_NAME);
    expect(facts.present).toBe(true);
    expect(facts.running).toBe(true);
    expect(facts.status).toBe("running");
    expect(facts.health).toBe("healthy");
    expect(facts.imageTag).toBe(`edge-app:${FULL_SHA}`);
  });

  it("returns absent facts when container is missing", () => {
    const facts = readContainerProductionFacts(mockExecFile(null), APP_PROD_CONTAINER_NAME);
    expect(facts.present).toBe(false);
    expect(facts.running).toBe(false);
  });
});

describe("ownership guards", () => {
  it("detects container port ownership", () => {
    const facts = readContainerProductionFacts(mockExecFile("running"));
    expect(isContainerBoundPort3000(facts)).toBe(true);
  });

  it("collects port ownership facts", () => {
    const facts = collectPortOwnershipFacts({
      execFile: mockExecFile("running"),
      listenPidsOnPort: () => [],
      isLaunchAgentLoaded: () => false,
    });
    expect(facts.containerBoundPort3000).toBe(true);
    expect(facts.legacyLaunchAgentLoaded).toBe(false);
  });

  it("refuses container lifecycle when launchd is loaded", () => {
    const error = assertContainerLifecycleAllowed({
      execFile: mockExecFile(null),
      listenPidsOnPort: () => [],
      isLaunchAgentLoaded: () => true,
      launchAgentBlocksContainer: () => true,
    });
    expect(error).toMatch(/LaunchAgent/);
  });

  it("allows container lifecycle when launchd is stopped but registered", () => {
    const error = assertContainerLifecycleAllowed({
      execFile: mockExecFile(null),
      listenPidsOnPort: () => [],
      isLaunchAgentLoaded: () => true,
      launchAgentBlocksContainer: () => false,
    });
    expect(error).toBeNull();
  });

  it("refuses container lifecycle when unmanaged listeners own port 3000", () => {
    const error = assertContainerLifecycleAllowed({
      execFile: mockExecFile(null),
      listenPidsOnPort: () => [4242],
      isLaunchAgentLoaded: () => false,
    });
    expect(error).toMatch(/unmanaged process/);
  });

  it("allows container lifecycle when app-prod owns the port", () => {
    const error = assertContainerLifecycleAllowed({
      execFile: mockExecFile("running"),
      listenPidsOnPort: () => [9999],
      isLaunchAgentLoaded: () => false,
    });
    expect(error).toBeNull();
  });

  it("refuses legacy start when container production is running", () => {
    const error = assertLegacyProductionStartAllowed({
      execFile: mockExecFile("running"),
    });
    expect(error).toMatch(/Docker container production/);
  });

  it("returns no unmanaged listeners when container is running", () => {
    const listeners = unmanagedPort3000Listeners(
      {
        execFile: mockExecFile("running"),
        listenPidsOnPort: () => [1111],
      },
      readContainerProductionFacts(mockExecFile("running")),
    );
    expect(listeners).toEqual([]);
  });
});
