import { describe, expect, it, vi } from "vitest";

import {
  readDevelopmentGitFacts,
  runShipLocalProdCommand,
  ShipLocalProdHelpRequestedError,
  parseShipLocalProdArgs,
} from "./ship-local-prod.mts";

function mockShipDeps(
  partial: Partial<{
    execFile: (file: string, args: string[]) => string;
    runCiLocal: () => number;
    runGitPush: () => number;
    runContainerDeploy: () => Promise<number>;
    runContainerStatus: () => Promise<number>;
  }> = {},
) {
  return {
    execFile: vi.fn((file: string, args: string[]) => {
      if (file === "git" && args.includes("status")) return "";
      if (file === "git" && args.includes("--abbrev-ref")) return "main";
      return "";
    }),
    runCiLocal: vi.fn(() => 0),
    runGitPush: vi.fn(() => 0),
    runContainerDeploy: vi.fn(async () => 0),
    runContainerStatus: vi.fn(async () => 0),
    ...partial,
  };
}

describe("parseShipLocalProdArgs", () => {
  it("parses defaults", () => {
    const options = parseShipLocalProdArgs([], "/tmp/dev");
    expect(options.developmentRoot).toBe("/tmp/dev");
  });

  it("throws help for --help", () => {
    expect(() => parseShipLocalProdArgs(["--help"], "/tmp/dev")).toThrow(
      ShipLocalProdHelpRequestedError,
    );
  });
});

describe("readDevelopmentGitFacts", () => {
  it("reads clean main facts", () => {
    const facts = readDevelopmentGitFacts("/tmp/dev", (file, args) => {
      if (file === "git" && args.includes("status")) return "";
      if (file === "git" && args.includes("--abbrev-ref")) return "main\n";
      return "";
    });
    expect(facts).toEqual({ clean: true, branch: "main" });
  });

  it("detects dirty worktree", () => {
    const facts = readDevelopmentGitFacts("/tmp/dev", (file, args) => {
      if (file === "git" && args.includes("status")) return " M foo.ts\n";
      if (file === "git" && args.includes("--abbrev-ref")) return "main\n";
      return "";
    });
    expect(facts.clean).toBe(false);
  });
});

describe("runShipLocalProdCommand", () => {
  it("refuses dirty worktree", async () => {
    const deps = mockShipDeps({
      execFile: vi.fn((file, args) => {
        if (file === "git" && args.includes("status")) return " M foo.ts\n";
        if (file === "git" && args.includes("--abbrev-ref")) return "main\n";
        return "";
      }),
    });

    const code = await runShipLocalProdCommand({ developmentRoot: "/tmp/dev" }, deps);
    expect(code).toBe(1);
    expect(deps.runCiLocal).not.toHaveBeenCalled();
  });

  it("refuses non-main branch", async () => {
    const deps = mockShipDeps({
      execFile: vi.fn((file, args) => {
        if (file === "git" && args.includes("status")) return "";
        if (file === "git" && args.includes("--abbrev-ref")) return "feature/foo\n";
        return "";
      }),
    });

    const code = await runShipLocalProdCommand({ developmentRoot: "/tmp/dev" }, deps);
    expect(code).toBe(1);
    expect(deps.runCiLocal).not.toHaveBeenCalled();
  });

  it("runs ci, push, deploy, and status on clean main", async () => {
    const deps = mockShipDeps();

    const code = await runShipLocalProdCommand({ developmentRoot: "/tmp/dev" }, deps);
    expect(code).toBe(0);
    expect(deps.runCiLocal).toHaveBeenCalled();
    expect(deps.runGitPush).toHaveBeenCalled();
    expect(deps.runContainerDeploy).toHaveBeenCalled();
    expect(deps.runContainerStatus).toHaveBeenCalled();
  });

  it("stops at ci_local failure", async () => {
    const deps = mockShipDeps({
      runCiLocal: vi.fn(() => 1),
    });

    const code = await runShipLocalProdCommand({ developmentRoot: "/tmp/dev" }, deps);
    expect(code).toBe(1);
    expect(deps.runGitPush).not.toHaveBeenCalled();
  });

  it("stops at container_deploy failure", async () => {
    const deps = mockShipDeps({
      runContainerDeploy: vi.fn(async () => 1),
    });

    const code = await runShipLocalProdCommand({ developmentRoot: "/tmp/dev" }, deps);
    expect(code).toBe(1);
    expect(deps.runContainerStatus).not.toHaveBeenCalled();
  });
});
