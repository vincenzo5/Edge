import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  HelpRequestedError,
  isLaunchAgentLoaded,
  loadDeployInputSync,
  parseLocalProdArgs,
  readBuildId,
  readRuntimeMeta,
  readWorktreeFacts,
  readWorktreeRevision,
  rotateLogIfNeeded,
  runLogsCommand,
  runPreflightCheck,
  runSetupCommand,
  runStartCommand,
  runStopCommand,
  type LocalProdDeps,
  type LocalProdOptions,
} from "./local-prod.mts";
import { validateLocalDeploy, type LocalDeployInput } from "./validate-local-deploy.mts";

const DEV_SECRET = "dev-secret-abcdefghijklmnopqrstuvwxyz-123";
const PROD_SECRET = "prod-secret-abcdefghijklmnopqrstuvwxyz-456";
const API_KEY = "api-key-abcdefghijklmnopqrstuvwxyz-789";

function makeFixtureRoots() {
  const root = mkdtempSync(join(tmpdir(), "edge-local-prod-"));
  const devRoot = join(root, "TV AI");
  const prodRoot = join(root, "TV AI-production");
  mkdirSync(devRoot, { recursive: true });
  mkdirSync(prodRoot, { recursive: true });
  writeFileSync(join(prodRoot, ".git"), "gitdir: ../.git/worktrees/prod\n", "utf8");
  writeFileSync(
    join(devRoot, ".env.local"),
    [
      "EDGE_APP_HOST=127.0.0.1",
      "EDGE_APP_PORT=3003",
      "DATABASE_URL=postgres://edge:dev-password@localhost:5432/edge_dev",
      "EDGE_MARKET_DATA_CACHE_BACKEND=redis",
      "REDIS_URL=redis://localhost:6379",
      "EDGE_CACHE_ENV=dev",
      "EDGE_REQUIRE_REDIS=0",
      "EDGE_AUTH_SECRET=" + DEV_SECRET,
      "EDGE_API_AUTH_MODE=dev-open",
      "EDGE_ALLOW_OPEN_DEV_SESSION=1",
      "TWS_ENABLED=false",
    ].join("\n") + "\n",
    "utf8",
  );
  writeFileSync(
    join(prodRoot, ".env.production.local"),
    [
      "EDGE_APP_HOST=127.0.0.1",
      "EDGE_APP_PORT=3000",
      "DATABASE_URL=postgres://edge:prod-password@localhost:5432/edge_prod",
      "EDGE_MARKET_DATA_CACHE_BACKEND=redis",
      "REDIS_URL=redis://localhost:6379",
      "EDGE_CACHE_ENV=prod",
      "EDGE_REQUIRE_REDIS=1",
      "EDGE_AUTH_SECRET=" + PROD_SECRET,
      "EDGE_API_AUTH_MODE=key",
      "EDGE_API_KEY=" + API_KEY,
      "EDGE_ALLOW_OPEN_DEV_SESSION=0",
      "EDGE_READYZ_URL=http://127.0.0.1:3000/readyz",
      "TWS_ENABLED=false",
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  return { devRoot, prodRoot };
}

function validInput(overrides: Partial<LocalDeployInput> = {}): LocalDeployInput {
  const { devRoot, prodRoot } = makeFixtureRoots();
  return {
    development: {
      EDGE_APP_HOST: "127.0.0.1",
      EDGE_APP_PORT: "3003",
      DATABASE_URL: "postgres://edge:dev-password@localhost:5432/edge_dev",
      EDGE_MARKET_DATA_CACHE_BACKEND: "redis",
      REDIS_URL: "redis://localhost:6379",
      EDGE_CACHE_ENV: "dev",
      EDGE_REQUIRE_REDIS: "0",
      EDGE_AUTH_SECRET: DEV_SECRET,
      EDGE_API_AUTH_MODE: "dev-open",
      EDGE_ALLOW_OPEN_DEV_SESSION: "1",
      TWS_ENABLED: "false",
    },
    production: {
      EDGE_APP_HOST: "127.0.0.1",
      EDGE_APP_PORT: "3000",
      DATABASE_URL: "postgres://edge:prod-password@localhost:5432/edge_prod",
      EDGE_MARKET_DATA_CACHE_BACKEND: "redis",
      REDIS_URL: "redis://localhost:6379",
      EDGE_CACHE_ENV: "prod",
      EDGE_REQUIRE_REDIS: "1",
      EDGE_AUTH_SECRET: PROD_SECRET,
      EDGE_API_AUTH_MODE: "key",
      EDGE_API_KEY: API_KEY,
      EDGE_ALLOW_OPEN_DEV_SESSION: "0",
      EDGE_READYZ_URL: "http://127.0.0.1:3000/readyz",
      TWS_ENABLED: "false",
    },
    developmentRoot: devRoot,
    productionRoot: prodRoot,
    developmentEnvPath: join(devRoot, ".env.local"),
    productionEnvPath: join(prodRoot, ".env.production.local"),
    productionEnvFile: { exists: true, mode: 0o600 },
    productionWorktree: {
      exists: true,
      isGitWorktree: true,
      clean: true,
      detached: true,
    },
    ...overrides,
  };
}

function baseOptions(overrides: Partial<LocalProdOptions> = {}): LocalProdOptions {
  const input = validInput();
  return {
    command: "status",
    developmentRoot: input.developmentRoot,
    productionRoot: input.productionRoot,
    developmentEnvPath: input.developmentEnvPath,
    productionEnvPath: input.productionEnvPath,
    revision: null,
    skipInfra: true,
    tailLines: 200,
    ...overrides,
  };
}

function mockDeps(partial: Partial<LocalProdDeps> = {}): LocalProdDeps {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  return {
    execFile: vi.fn(() => ""),
    existsSync: (path) => files.has(path) || dirs.has(path),
    readFileSync: (path) => files.get(String(path)) ?? "",
    writeFileSync: (path, data) => {
      files.set(String(path), String(data));
    },
    appendFileSync: (path, data) => {
      files.set(String(path), (files.get(String(path)) ?? "") + String(data));
    },
    mkdirSync: (path) => {
      dirs.add(String(path));
    },
    unlinkSync: (path) => {
      files.delete(String(path));
    },
    statSync: vi.fn(() => ({ size: 0 })),
    renameSync: vi.fn(),
    probeReadyz: vi.fn(async () => ({ ok: true, reasons: [] })),
    spawnProcess: vi.fn(() => ({ pid: 4242, unref: () => undefined })),
    killProcess: vi.fn(() => true),
    processAlive: vi.fn(() => false),
    listenPidsOnPort: vi.fn(() => []),
    fetchImpl: fetch,
    uid: 501,
    sleep: vi.fn(async () => {}),
    ...partial,
  };
}

describe("parseLocalProdArgs", () => {
  it("parses setup with revision", () => {
    const options = parseLocalProdArgs(["setup", "--revision", "abc123"], "/tmp/dev");
    expect(options.command).toBe("setup");
    expect(options.revision).toBe("abc123");
  });

  it("throws help for empty argv", () => {
    expect(() => parseLocalProdArgs([], "/tmp/dev")).toThrow(HelpRequestedError);
  });

  it("rejects unknown options", () => {
    expect(() => parseLocalProdArgs(["status", "--unknown", "x"], "/tmp/dev")).toThrow(
      /Unknown option/,
    );
  });
});

describe("runPreflightCheck", () => {
  it("passes for valid paired profiles", () => {
    expect(runPreflightCheck(validInput())).toBe(0);
  });

  it("fails for unsafe production auth", () => {
    const input = validInput();
    input.production.EDGE_API_AUTH_MODE = "dev-open";
    expect(runPreflightCheck(input)).toBe(1);
  });
});

describe("runSetupCommand", () => {
  it("requires revision", async () => {
    const code = await runSetupCommand(baseOptions({ command: "setup" }), mockDeps());
    expect(code).toBe(2);
  });

  it("creates worktree when missing", async () => {
    const options = baseOptions({ command: "setup", revision: "abc123" });
    const execFile = vi.fn((file, args) => {
      if (file === "git" && args[0] === "worktree") return "";
      if (file === "git" && args.includes("rev-parse")) return "abc123";
      return "";
    });
    const deps = mockDeps({
      execFile,
      existsSync: (path) => path !== options.productionRoot,
    });
    const code = await runSetupCommand(options, deps);
    expect(code).toBe(0);
    expect(execFile).toHaveBeenCalledWith(
      "git",
      ["worktree", "add", "--detach", options.productionRoot, "abc123"],
      expect.any(Object),
    );
  });

  it("is idempotent when worktree already matches revision", async () => {
    const options = baseOptions({ command: "setup", revision: "abc123" });
    const execFile = vi.fn((file, args) => {
      if (file === "git" && args.includes("rev-parse")) return "abc123";
      if (file === "git" && args.includes("status")) return "";
      if (file === "git" && args.includes("symbolic-ref")) throw new Error("detached");
      return "";
    });
    const deps = mockDeps({
      execFile,
      existsSync: () => true,
    });
    const code = await runSetupCommand(options, deps);
    expect(code).toBe(0);
    expect(execFile).not.toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["worktree", "add"]),
      expect.anything(),
    );
  });
});

describe("runStartCommand", () => {
  it("refuses unmanaged port collision", async () => {
    const options = baseOptions({ command: "start" });
    const deps = mockDeps({
      existsSync: (path) => String(path).endsWith("BUILD_ID") || String(path).includes(".env"),
      readFileSync: (path) => (String(path).endsWith("BUILD_ID") ? "build-1" : ""),
      listenPidsOnPort: () => [9999],
    });
    const code = await runStartCommand(options, deps);
    expect(code).toBe(1);
  });

  it("refuses when managed process already running", async () => {
    const options = baseOptions({ command: "start" });
    const metaPath = join(options.developmentRoot, ".edge/local-prod/local-prod.meta.json");
    const deps = mockDeps({
      existsSync: (path) =>
        String(path).endsWith("BUILD_ID") ||
        String(path) === metaPath ||
        String(path).includes(".env"),
      readFileSync: (path) => {
        if (String(path).endsWith("BUILD_ID")) return "build-1";
        if (String(path) === metaPath) {
          return JSON.stringify({
            pid: 111,
            startedAt: "2026-01-01T00:00:00.000Z",
            revision: "abc",
            buildId: "build-1",
            host: "127.0.0.1",
            port: 3000,
            logPath: "/tmp/log",
            supervisor: "manual",
          });
        }
        return "";
      },
      processAlive: (pid) => pid === 111,
    });
    const code = await runStartCommand(options, deps);
    expect(code).toBe(1);
  });

  it("refuses when launchd owns production", async () => {
    const options = baseOptions({ command: "start" });
    const deps = mockDeps({
      existsSync: (path) => String(path).endsWith("BUILD_ID") || String(path).includes(".env"),
      readFileSync: (path) => (String(path).endsWith("BUILD_ID") ? "build-1" : ""),
      execFile: vi.fn((file, args) => {
        if (file === "launchctl" && args[0] === "print") return "state = running";
        return "";
      }),
    });
    const code = await runStartCommand(options, deps);
    expect(code).toBe(1);
  });
});

describe("runStopCommand", () => {
  it("noops when no managed process exists", async () => {
    const code = await runStopCommand(baseOptions({ command: "stop" }), mockDeps());
    expect(code).toBe(0);
  });
});

describe("runLogsCommand", () => {
  it("prints empty when no logs exist", () => {
    const options = baseOptions({ command: "logs" });
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      runLogsCommand(options, mockDeps());
    } finally {
      console.log = originalLog;
    }
    expect(logs).toContain("production.logs=empty");
  });
});

describe("rotateLogIfNeeded", () => {
  it("rotates when file exceeds max bytes", () => {
    const logPath = "/tmp/local-prod.log";
    const deps = mockDeps({
      existsSync: (path) => String(path) === logPath,
      statSync: vi.fn(() => ({ size: 11 * 1024 * 1024 })),
    });
    rotateLogIfNeeded(logPath, deps);
    expect(deps.renameSync).toHaveBeenCalledWith(logPath, `${logPath}.1`);
  });
});

describe("isLaunchAgentLoaded", () => {
  it("returns false when launchctl print fails", () => {
    const deps = mockDeps({
      execFile: vi.fn(() => {
        throw new Error("not loaded");
      }),
    });
    expect(isLaunchAgentLoaded(deps)).toBe(false);
  });
});

describe("readWorktreeFacts", () => {
  it("reports missing worktree", () => {
    expect(readWorktreeFacts("/missing/path")).toEqual({
      exists: false,
      isGitWorktree: false,
      clean: false,
      detached: false,
    });
  });
});

describe("readBuildId", () => {
  it("returns null when build output is missing", () => {
    const deps = mockDeps({ existsSync: () => false });
    expect(readBuildId("/tmp/prod", deps)).toBeNull();
  });
});

describe("loadDeployInputSync", () => {
  it("loads env files without echoing secrets in validation messages", () => {
    const options = baseOptions();
    const input = loadDeployInputSync(options, mockDeps({ existsSync: () => true, readFileSync: (path) => {
      if (String(path).endsWith(".env.local")) {
        return "EDGE_APP_HOST=127.0.0.1\nEDGE_APP_PORT=3003\nDATABASE_URL=postgres://edge:dev-password@localhost:5432/edge_dev\nEDGE_CACHE_ENV=dev\nEDGE_REQUIRE_REDIS=0\nEDGE_AUTH_SECRET=" + DEV_SECRET + "\nEDGE_API_AUTH_MODE=dev-open\nTWS_ENABLED=false\nREDIS_URL=redis://localhost:6379\nEDGE_MARKET_DATA_CACHE_BACKEND=redis\nEDGE_ALLOW_OPEN_DEV_SESSION=1\n";
      }
      return "EDGE_APP_HOST=127.0.0.1\nEDGE_APP_PORT=3000\nDATABASE_URL=postgres://edge:prod-password@localhost:5432/edge_prod\nEDGE_CACHE_ENV=prod\nEDGE_REQUIRE_REDIS=1\nEDGE_AUTH_SECRET=" + PROD_SECRET + "\nEDGE_API_KEY=" + API_KEY + "\nEDGE_API_AUTH_MODE=key\nTWS_ENABLED=false\nREDIS_URL=redis://localhost:6379\nEDGE_MARKET_DATA_CACHE_BACKEND=redis\nEDGE_ALLOW_OPEN_DEV_SESSION=0\nEDGE_READYZ_URL=http://127.0.0.1:3000/readyz\n";
    } }));
    const issues = validateLocalDeploy({
      ...input,
      productionEnvFile: { exists: true, mode: 0o600 },
      productionWorktree: {
        exists: true,
        isGitWorktree: true,
        clean: true,
        detached: true,
      },
    });
    expect(issues).toEqual([]);
    expect(JSON.stringify(issues)).not.toContain("prod-password");
    expect(JSON.stringify(issues)).not.toContain(API_KEY);
  });
});

describe("readRuntimeMeta", () => {
  it("returns null for invalid meta", () => {
    const options = baseOptions();
    const deps = mockDeps({
      existsSync: () => true,
      readFileSync: () => "not-json",
    });
    expect(readRuntimeMeta(options.developmentRoot, deps)).toBeNull();
  });
});

describe("readWorktreeRevision", () => {
  it("returns revision from git", () => {
    const prodRoot = mkdtempSync(join(tmpdir(), "edge-prod-rev-"));
    const execFile = vi.fn(() => "deadbeef");
    expect(readWorktreeRevision(prodRoot, execFile)).toBe("deadbeef");
  });
});
