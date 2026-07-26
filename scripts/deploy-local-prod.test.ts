import { existsSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  probeHealthz,
  probeMarketDataCache,
  runDeployHealthGate,
} from "./deploy-health-gate.mts";
import {
  classifyMigrationChanges,
  scanSqlForDestructivePatterns,
} from "./deploy-migration-policy.mts";
import {
  DeployHelpRequestedError,
  parseDeployLocalProdArgs,
  promoteProductionWorktree,
  resolveGitRevision,
  runDeployCommand,
  runRollbackCommand,
  type DeployLocalProdDeps,
} from "./deploy-local-prod.mts";
import {
  readDeployRevisionState,
  writeDeployRevisionState,
  type LocalProdOptions,
} from "./local-prod.mts";
import { validateLocalDeploy, type LocalDeployInput } from "./validate-local-deploy.mts";

const DEV_SECRET = "dev-secret-abcdefghijklmnopqrstuvwxyz-123";
const PROD_SECRET = "prod-secret-abcdefghijklmnopqrstuvwxyz-456";
const API_KEY = "api-key-abcdefghijklmnopqrstuvwxyz-789";

function makeFixtureRoots() {
  const root = mkdtempSync(join(tmpdir(), "edge-deploy-"));
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

function deployOptions(overrides: Partial<LocalProdOptions & { command: "deploy" | "rollback"; skipStartup: boolean; revision: string | null }> = {}) {
  const input = validInput();
  return {
    command: "deploy" as const,
    developmentRoot: input.developmentRoot,
    productionRoot: input.productionRoot,
    developmentEnvPath: input.developmentEnvPath,
    productionEnvPath: input.productionEnvPath,
    revision: "abc123",
    skipInfra: true,
    skipStartup: true,
    tailLines: 200,
    ...overrides,
  };
}

function mockDeployDeps(partial: Partial<DeployLocalProdDeps> = {}): DeployLocalProdDeps {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const base: DeployLocalProdDeps = {
    execFile: vi.fn((file, args) => {
      if (file === "git" && args.includes("rev-parse")) return "abc123";
      if (file === "git" && args.includes("status")) return "";
      if (file === "git" && args.includes("symbolic-ref")) throw new Error("detached");
      if (file === "git" && args.includes("diff")) return "";
      return "";
    }),
    existsSync: (path) => {
      const value = String(path);
      if (files.has(value) || dirs.has(value)) return true;
      try {
        return existsSync(value);
      } catch {
        return false;
      }
    },
    readFileSync: (path) => {
      const value = String(path);
      if (files.has(value)) return files.get(value)!;
      try {
        return readFileSync(value, "utf8");
      } catch {
        return "";
      }
    },
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
    statSync: vi.fn((path) => {
      try {
        return statSync(String(path));
      } catch {
        return { size: 0o600 };
      }
    }),
    renameSync: (from, to) => {
      const content = files.get(String(from));
      if (content !== undefined) {
        files.set(String(to), content);
        files.delete(String(from));
      }
    },
    probeReadyz: vi.fn(async () => ({ ok: true, reasons: [] as string[] })),
    spawnProcess: vi.fn(),
    killProcess: vi.fn(() => true),
    processAlive: vi.fn(() => false),
    listenPidsOnPort: vi.fn(() => []),
    fetchImpl: vi.fn(async () =>
      Response.json({ ok: true, health: { cache: { kind: "redis", degraded: false } } }),
    ) as unknown as typeof fetch,
    uid: 501,
    sleep: vi.fn(async () => {}),
    runStartupCheck: vi.fn(() => 0),
    runInfraUp: vi.fn(() => 0),
    runMigrate: vi.fn(async () => 0),
    runBuild: vi.fn(async () => 0),
    restartService: vi.fn(() => 0),
    runHealthGate: vi.fn(async () => ({
      ok: true,
      healthz: true,
      readyz: true,
      cacheKind: "redis",
      cacheDegraded: false,
      reasons: [],
    })),
    readProductionBuildId: vi.fn(() => "build-1"),
    stopServiceIfLoaded: vi.fn(() => 0),
  };
  return { ...base, ...partial };
}

describe("deploy revision state", () => {
  it("roundtrips through mock deps", () => {
    const input = validInput();
    const deps = mockDeployDeps();
    writeDeployRevisionState(
      input.developmentRoot,
      {
        currentSha: "abc123",
        previousSha: null,
        pendingSha: null,
        failedSha: null,
        promotedAt: "2026-07-25T00:00:00.000Z",
        buildId: "build-1",
      },
      deps,
    );
    const state = readDeployRevisionState(input.developmentRoot, deps);
    expect(state.currentSha).toBe("abc123");
  });
});

describe("parseDeployLocalProdArgs", () => {
  it("parses deploy with revision", () => {
    const options = parseDeployLocalProdArgs(["deploy", "--revision", "abc123"], "/tmp/dev");
    expect(options.command).toBe("deploy");
    expect(options.revision).toBe("abc123");
    expect(options.skipStartup).toBe(false);
  });

  it("throws help for empty argv", () => {
    expect(() => parseDeployLocalProdArgs([], "/tmp/dev")).toThrow(DeployHelpRequestedError);
  });
});

describe("scanSqlForDestructivePatterns", () => {
  it("flags DROP TABLE", () => {
    expect(scanSqlForDestructivePatterns('DROP TABLE IF EXISTS "foo";')).not.toHaveLength(0);
  });

  it("allows additive DDL", () => {
    expect(scanSqlForDestructivePatterns("CREATE TABLE foo (id text PRIMARY KEY);")).toHaveLength(0);
  });
});

describe("classifyMigrationChanges", () => {
  it("passes when no migration files changed", () => {
    const execFile = vi.fn(() => "");
    const result = classifyMigrationChanges(execFile, "/repo", "aaa", "bbb");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.changedFiles).toEqual([]);
  });
});

describe("runDeployHealthGate", () => {
  it("passes when all probes succeed", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/healthz")) return Response.json({ ok: true });
      if (url.includes("/readyz")) return Response.json({ ok: true });
      if (url.includes("/api/market-data/health")) {
        return Response.json({ ok: true, health: { cache: { kind: "redis", degraded: false } } });
      }
      return Response.json({ ok: false });
    }) as unknown as typeof fetch;

    const result = await runDeployHealthGate({
      fetchImpl,
      retries: 1,
      retryDelayMs: 0,
    });
    expect(result.ok).toBe(true);
  });

  it("fails when cache is degraded", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/healthz")) return Response.json({ ok: true });
      if (url.includes("/readyz")) return Response.json({ ok: true });
      if (url.includes("/api/market-data/health")) {
        return Response.json({ ok: true, health: { cache: { kind: "redis", degraded: true } } });
      }
      return Response.json({ ok: false });
    }) as unknown as typeof fetch;

    const result = await runDeployHealthGate({
      fetchImpl,
      retries: 1,
      retryDelayMs: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("cache_degraded");
  });
});

describe("probeHealthz", () => {
  it("returns true for ok healthz", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true })) as unknown as typeof fetch;
    await expect(probeHealthz("http://127.0.0.1:3000/healthz", fetchImpl)).resolves.toBe(true);
  });
});

describe("probeMarketDataCache", () => {
  it("requires redis and not degraded", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ ok: true, health: { cache: { kind: "redis", degraded: false } } }),
    ) as unknown as typeof fetch;
    await expect(
      probeMarketDataCache("http://127.0.0.1:3000/api/market-data/health", API_KEY, fetchImpl),
    ).resolves.toEqual({ ok: true, kind: "redis", degraded: false });
  });
});

describe("runDeployCommand", () => {
  it("refuses legacy deploy after Phase 5 retirement", async () => {
    const code = await runDeployCommand(deployOptions(), mockDeployDeps());
    expect(code).toBe(1);
  });

  it("refuses rollback without reaching previous revision lookup", async () => {
    const input = validInput();
    const options = deployOptions({
      command: "rollback",
      revision: null,
      developmentRoot: input.developmentRoot,
      productionRoot: input.productionRoot,
      developmentEnvPath: input.developmentEnvPath,
      productionEnvPath: input.productionEnvPath,
    });
    const code = await runRollbackCommand(options, mockDeployDeps());
    expect(code).toBe(1);
  });
});

describe("runRollbackCommand legacy retirement", () => {
  it("refuses legacy rollback after Phase 5 retirement", async () => {
    const input = validInput();
    const options = deployOptions({
      command: "rollback",
      revision: null,
      developmentRoot: input.developmentRoot,
      productionRoot: input.productionRoot,
      developmentEnvPath: input.developmentEnvPath,
      productionEnvPath: input.productionEnvPath,
    });
    const code = await runRollbackCommand(options, mockDeployDeps());
    expect(code).toBe(1);
  });
});

describe("promoteProductionWorktree", () => {
  it("creates worktree when missing", () => {
    const options = deployOptions();
    const execFile = vi.fn((file, args) => {
      if (file === "git" && args.includes("rev-parse")) return "abc123";
      if (file === "git" && args.includes("status")) return "";
      if (file === "git" && args.includes("symbolic-ref")) throw new Error("detached");
      return "";
    });
    const deps = mockDeployDeps({
      execFile,
      existsSync: (path) => path !== options.productionRoot,
    });
    const code = promoteProductionWorktree(options, "abc123", deps);
    expect(code).toBe(0);
    expect(execFile).toHaveBeenCalledWith(
      "git",
      ["worktree", "add", "--detach", options.productionRoot, "abc123"],
      expect.any(Object),
    );
  });
});

describe("resolveGitRevision", () => {
  it("delegates to git rev-parse", () => {
    const execFile = vi.fn(() => "deadbeef");
    expect(resolveGitRevision("/repo", "HEAD", execFile)).toBe("deadbeef");
    expect(execFile).toHaveBeenCalledWith("git", ["-C", "/repo", "rev-parse", "HEAD"]);
  });
});

describe("runPreflightCheck integration", () => {
  it("passes for valid paired profiles", () => {
    const input = validInput();
    expect(validateLocalDeploy(input)).toHaveLength(0);
  });
});
