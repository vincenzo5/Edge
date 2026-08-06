import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  edgeAppRetainTagsFromState,
  imageTagForSha,
  migrateImageTagForSha,
  pruneEdgeAppImages,
  readImageDigest,
} from "./build-app-image.mts";
import {
  assertDockerContainerHealthy,
  ContainerDeployHelpRequestedError,
  imageExists,
  loadContainerDeployInputSync,
  parseDeployLocalProdContainerArgs,
  restoreWorktreeAfterChartPerf,
  runContainerDeployCommand,
  runContainerPreflightCheck,
  runContainerRollbackCommand,
  type DeployLocalProdContainerDeps,
} from "./deploy-local-prod-container.mts";
import {
  formatDeployRevisionStatus,
  readDeployRevisionState,
  writeDeployRevisionState,
} from "./local-prod.mts";
import {
  LOCAL_CONTAINER_PRODUCTION_CONTRACT,
  resolveContainerProductionEnvPath,
} from "./validate-local-deploy.mts";

const FULL_SHA = "5aa83b921c51a7dadc625101076301ce765ac03d";
const PREV_SHA = "3cc72af11f3bda4b256abdd4fe0b13768088ae87";
const BAD_SHA = "2b4d57ce392794c30a8c085829b6bcf2112bd166";
const DEV_SECRET = "dev-secret-abcdefghijklmnopqrstuvwxyz-123";
const PROD_SECRET = "prod-secret-abcdefghijklmnopqrstuvwxyz-456";
const API_KEY = "api-key-abcdefghijklmnopqrstuvwxyz-789";
const IMAGE_TAG = imageTagForSha(FULL_SHA);
const DIGEST = "sha256:abc123digest";

function makeFixtureRoots() {
  const root = mkdtempSync(join(tmpdir(), "edge-container-deploy-"));
  const devRoot = join(root, "TV AI");
  mkdirSync(devRoot, { recursive: true });
  mkdirSync(join(devRoot, "src", "db", "migrations"), { recursive: true });
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
  mkdirSync(join(devRoot, ".edge", "local-prod"), { recursive: true });
  writeFileSync(
    resolveContainerProductionEnvPath(devRoot),
    [
      "EDGE_APP_HOST=127.0.0.1",
      "EDGE_APP_PORT=3000",
      "DATABASE_URL=postgres://edge:prod-password@postgres:5432/edge_prod",
      "EDGE_MARKET_DATA_CACHE_BACKEND=redis",
      "REDIS_URL=redis://redis:6379",
      "EDGE_CACHE_ENV=prod",
      "EDGE_REQUIRE_REDIS=1",
      "EDGE_AUTH_SECRET=" + PROD_SECRET,
      "EDGE_API_AUTH_MODE=key",
      "EDGE_API_KEY=" + API_KEY,
      "EDGE_ALLOW_OPEN_DEV_SESSION=1",
      "EDGE_READYZ_URL=http://127.0.0.1:3000/readyz",
      "TWS_ENABLED=false",
      "TWS_MANAGED=external",
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  return { devRoot };
}

function deployOptions(overrides: Partial<{
  command: "deploy" | "rollback";
  revision: string | null;
  skipInfra: boolean;
  skipStartup: boolean;
  skipChartPerf: boolean;
  developmentRoot: string;
}> = {}) {
  const { devRoot } = makeFixtureRoots();
  return {
    command: "deploy" as const,
    developmentRoot: devRoot,
    revision: FULL_SHA,
    skipInfra: true,
    skipStartup: true,
    skipChartPerf: true,
    ...overrides,
  };
}

function mockContainerDeployDeps(
  partial: Partial<DeployLocalProdContainerDeps> = {},
): DeployLocalProdContainerDeps {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const base: DeployLocalProdContainerDeps = {
    execFile: vi.fn((file: string, args: string[]) => {
      if (file === "git" && args.includes("rev-parse")) return FULL_SHA;
      if (file === "git" && args.includes("diff")) return "";
      if (file === "docker" && args[0] === "image" && args[1] === "inspect") {
        const tag = args.at(-1);
        if (
          tag === IMAGE_TAG ||
          tag === imageTagForSha(PREV_SHA) ||
          tag === migrateImageTagForSha(FULL_SHA) ||
          tag === migrateImageTagForSha(PREV_SHA)
        ) {
          return "";
        }
        throw new Error("missing");
      }
      if (file === "docker" && args[0] === "inspect") {
        const target = args.at(-1);
        if (target === "edge-app-prod") {
          const formatIndex = args.indexOf("--format");
          const format = formatIndex >= 0 ? args[formatIndex + 1] : "";
          if (format.includes("State.Status")) return "running";
          if (format.includes("State.Health")) return "healthy";
          if (format.includes("Config.Image")) return IMAGE_TAG;
        }
        if (formatIncludes(args, "RepoDigests") || formatIncludes(args, ".Id")) {
          return DIGEST;
        }
      }
      if (file === "docker" && args[0] === "exec") return "build-123";
      if (file === "docker" && args[0] === "images") {
        return [
          IMAGE_TAG,
          imageTagForSha(PREV_SHA),
          imageTagForSha(BAD_SHA),
          migrateImageTagForSha(FULL_SHA),
        ].join("\n");
      }
      if (file === "launchctl" && args[0] === "print") throw new Error("not loaded");
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
        return { mode: 0o600 };
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
    buildDeps: {
      execFile: vi.fn((file: string, args: string[]) => {
        if (file === "docker" && args[0] === "image" && args[1] === "inspect") {
          const formatIndex = args.indexOf("--format");
          const format = formatIndex >= 0 ? args[formatIndex + 1] : "";
          if (format.includes("RepoDigests") || format.includes(".Id")) return DIGEST;
          if (format.includes("Config.User")) return "edge";
          if (format.includes("org.opencontainers.image.revision")) return FULL_SHA;
        }
        return "";
      }),
      execFileSync: vi.fn(),
      existsSync: vi.fn(() => true),
      mkdtempSync: vi.fn(),
      rmSync: vi.fn(),
      listImageTarEntries: vi.fn(() => ["app/server.js"]),
    },
    runStartupCheck: vi.fn(() => 0),
    runChartPerfCheck: vi.fn(() => 0),
    runInfraUp: vi.fn(() => 0),
    runContainerMigrate: vi.fn(() => 0),
    runContainerStart: vi.fn(() => 0),
    runHealthGate: vi.fn(async () => ({
      ok: true,
      healthz: true,
      readyz: true,
      cacheKind: "redis",
      cacheDegraded: false,
      reasons: [],
    })),
    readContainerBuildId: vi.fn(() => "build-123"),
    stopServiceIfLoaded: vi.fn(async () => 0),
    buildRuntimeAndMigrateImages: vi.fn(() => 0),
  };
  return { ...base, ...partial };
}

function formatIncludes(args: string[], needle: string): boolean {
  const formatIndex = args.indexOf("--format");
  if (formatIndex < 0) return false;
  return args[formatIndex + 1]?.includes(needle) ?? false;
}

describe("parseDeployLocalProdContainerArgs", () => {
  it("parses deploy with revision", () => {
    const options = parseDeployLocalProdContainerArgs(["deploy", "--revision", FULL_SHA], "/tmp/dev");
    expect(options.command).toBe("deploy");
    expect(options.revision).toBe(FULL_SHA);
    expect(options.skipStartup).toBe(false);
    expect(options.skipChartPerf).toBe(false);
  });

  it("parses --skip-chart-perf", () => {
    const options = parseDeployLocalProdContainerArgs(
      ["deploy", "--revision", FULL_SHA, "--skip-chart-perf"],
      "/tmp/dev",
    );
    expect(options.skipChartPerf).toBe(true);
  });

  it("throws help for empty argv", () => {
    expect(() => parseDeployLocalProdContainerArgs([], "/tmp/dev")).toThrow(
      ContainerDeployHelpRequestedError,
    );
  });
});

describe("formatDeployRevisionStatus digest fields", () => {
  it("includes digest lines without secrets", () => {
    const lines = formatDeployRevisionStatus({
      currentSha: FULL_SHA,
      previousSha: PREV_SHA,
      pendingSha: null,
      failedSha: null,
      promotedAt: "2026-07-26T00:00:00.000Z",
      buildId: "build-1",
      currentDigest: DIGEST,
      previousDigest: "sha256:prev",
      pendingDigest: null,
      failedDigest: null,
    });
    expect(lines).toContain(`deploy.current=${FULL_SHA}`);
    expect(lines).toContain(`deploy.currentDigest=${DIGEST}`);
    expect(lines.some((line) => line.includes(PROD_SECRET))).toBe(false);
  });
});

describe("runContainerPreflightCheck", () => {
  it("passes for valid container profiles", () => {
    const { devRoot } = makeFixtureRoots();
    const deps = mockContainerDeployDeps();
    const input = loadContainerDeployInputSync(devRoot, deps, {
      imageTag: IMAGE_TAG,
      buildContextClean: true,
      ociRevisionLabel: FULL_SHA,
      forbiddenPathsPresent: [],
    });
    expect(runContainerPreflightCheck(input)).toBe(0);
  });
});

describe("readImageDigest and pruneEdgeAppImages", () => {
  it("reads digest from docker inspect", () => {
    const execFile = vi.fn(() => DIGEST);
    expect(readImageDigest(IMAGE_TAG, execFile)).toBe(DIGEST);
  });

  it("prunes tags outside retain set", () => {
    const execFile = vi.fn((file: string, args: string[]) => {
      if (file === "docker" && args[0] === "images") {
        return [IMAGE_TAG, imageTagForSha(BAD_SHA)].join("\n");
      }
      return "";
    });
    const retain = edgeAppRetainTagsFromState({
      currentSha: FULL_SHA,
      previousSha: null,
      failedSha: null,
    });
    const result = pruneEdgeAppImages(retain, execFile);
    expect(result.kept).toContain(IMAGE_TAG);
    expect(result.removed).toContain(imageTagForSha(BAD_SHA));
  });
});

describe("assertDockerContainerHealthy", () => {
  it("requires healthy docker state", () => {
    const execFile = vi.fn((file: string, args: string[]) => {
      if (file === "docker" && args.includes("edge-app-prod")) {
        if (args.includes("State.Status")) return "running";
        if (args.includes("State.Health")) return "starting";
      }
      return "";
    });
    expect(assertDockerContainerHealthy(execFile).ok).toBe(false);
  });
});

describe("runContainerDeployCommand", () => {
  it("requires revision", async () => {
    const options = deployOptions({ revision: null });
    const deps = mockContainerDeployDeps();
    expect(await runContainerDeployCommand(options, deps)).toBe(2);
  });

  it("passes deploy and records digest state", async () => {
    const options = deployOptions();
    const deps = mockContainerDeployDeps();

    const code = await runContainerDeployCommand(options, deps);
    expect(code).toBe(0);
    expect(deps.buildRuntimeAndMigrateImages).toHaveBeenCalled();
    expect(deps.runContainerMigrate).toHaveBeenCalled();
    expect(deps.runContainerStart).toHaveBeenCalled();
    expect(deps.runHealthGate).toHaveBeenCalled();
    const state = readDeployRevisionState(options.developmentRoot, deps);
    expect(state.currentSha).toBe(FULL_SHA);
    expect(state.currentDigest).toBe(DIGEST);
    expect(state.buildId).toBe("build-123");
  });

  it("runs chart perf gate before build when not skipped", async () => {
    const options = deployOptions({ skipChartPerf: false });
    const deps = mockContainerDeployDeps();

    const code = await runContainerDeployCommand(options, deps);
    expect(code).toBe(0);
    expect(deps.runChartPerfCheck).toHaveBeenCalled();
    expect(deps.buildRuntimeAndMigrateImages).toHaveBeenCalled();
  });

  it("blocks deploy when chart perf budgets fail", async () => {
    const options = deployOptions({ skipChartPerf: false });
    const deps = mockContainerDeployDeps({
      runChartPerfCheck: vi.fn(() => 1),
    });

    const code = await runContainerDeployCommand(options, deps);
    expect(code).toBe(1);
    expect(deps.runChartPerfCheck).toHaveBeenCalled();
    expect(deps.buildRuntimeAndMigrateImages).not.toHaveBeenCalled();
  });

  it("restoreWorktreeAfterChartPerf clears perf baseline dirt", () => {
    const root = mkdtempSync(join(tmpdir(), "edge-chart-perf-restore-"));
    execFileSync("git", ["-C", root, "init"]);
    execFileSync("git", ["-C", root, "config", "user.email", "test@example.com"]);
    execFileSync("git", ["-C", root, "config", "user.name", "test"]);
    mkdirSync(join(root, "docs", "perf"), { recursive: true });
    mkdirSync(join(root, "examples", "chart-perf-harness", "dist-browser"), {
      recursive: true,
    });
    writeFileSync(join(root, "docs", "perf", "chart-baseline-latest.json"), "{}\n");
    writeFileSync(
      join(root, "docs", "perf", "runtime-interaction-baseline-latest.json"),
      "{}\n",
    );
    writeFileSync(
      join(root, "examples", "chart-perf-harness", "dist-browser", "index.html"),
      "<html></html>\n",
    );
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "commit", "-m", "seed"]);

    writeFileSync(join(root, "docs", "perf", "chart-baseline-latest.json"), '{"dirty":true}\n');
    writeFileSync(
      join(root, "docs", "perf", "chart-baseline-2026-07-27T00-00-00-000Z.json"),
      '{"temp":true}\n',
    );

    restoreWorktreeAfterChartPerf(root);

    expect(readFileSync(join(root, "docs", "perf", "chart-baseline-latest.json"), "utf8")).toBe(
      "{}\n",
    );
    expect(
      existsSync(join(root, "docs", "perf", "chart-baseline-2026-07-27T00-00-00-000Z.json")),
    ).toBe(false);
  });

  it("fails deploy when health gate fails without promoting current", async () => {
    const options = deployOptions();
    const deps = mockContainerDeployDeps({
      runHealthGate: vi.fn(async () => ({
        ok: false,
        healthz: true,
        readyz: false,
        cacheKind: "redis",
        cacheDegraded: false,
        reasons: ["readyz_unreachable"],
      })),
    });
    writeDeployRevisionState(
      options.developmentRoot,
      {
        currentSha: PREV_SHA,
        previousSha: null,
        pendingSha: null,
        failedSha: null,
        promotedAt: "2026-07-25T00:00:00.000Z",
        buildId: "old-build",
        currentDigest: "sha256:prev",
        previousDigest: null,
        pendingDigest: null,
        failedDigest: null,
      },
      deps,
    );

    const code = await runContainerDeployCommand(options, deps);
    expect(code).toBe(1);
    const state = readDeployRevisionState(options.developmentRoot, deps);
    expect(state.currentSha).toBe(PREV_SHA);
    expect(state.failedSha).toBe(FULL_SHA);
    expect(state.failedDigest).toBe(DIGEST);
  });
});

describe("runContainerRollbackCommand", () => {
  it("blocks when no previous revision", async () => {
    const options = deployOptions({ command: "rollback", revision: null });
    const deps = mockContainerDeployDeps();
    expect(await runContainerRollbackCommand(options, deps)).toBe(1);
  });

  it("restores previous revision and digest", async () => {
    const options = deployOptions({ command: "rollback", revision: null });
    const deps = mockContainerDeployDeps({
      readContainerBuildId: vi.fn(() => "prev-build"),
    });

    writeDeployRevisionState(
      options.developmentRoot,
      {
        currentSha: FULL_SHA,
        previousSha: PREV_SHA,
        pendingSha: null,
        failedSha: FULL_SHA,
        promotedAt: "2026-07-26T00:00:00.000Z",
        buildId: "bad-build",
        currentDigest: DIGEST,
        previousDigest: "sha256:prev",
        pendingDigest: null,
        failedDigest: DIGEST,
      },
      deps,
    );

    const code = await runContainerRollbackCommand(options, deps);
    expect(code).toBe(0);
    const state = readDeployRevisionState(options.developmentRoot, deps);
    expect(state.currentSha).toBe(PREV_SHA);
    expect(state.currentDigest).toBe("sha256:prev");
    expect(state.previousSha).toBeNull();
  });
});

describe("imageExists", () => {
  it("returns true when docker inspect succeeds", () => {
    const execFile = vi.fn(() => "");
    expect(imageExists(IMAGE_TAG, execFile)).toBe(true);
  });

  it("returns false when docker inspect fails", () => {
    const execFile = vi.fn(() => {
      throw new Error("missing");
    });
    expect(imageExists(IMAGE_TAG, execFile)).toBe(false);
  });
});

describe("edgeAppRetainTagsFromState", () => {
  it("retains runtime and migrate tags for tracked shas", () => {
    const retain = edgeAppRetainTagsFromState({
      currentSha: FULL_SHA,
      previousSha: PREV_SHA,
      failedSha: BAD_SHA,
    });
    expect(retain.has(imageTagForSha(FULL_SHA))).toBe(true);
    expect(retain.has(migrateImageTagForSha(FULL_SHA))).toBe(true);
    expect(retain.has(imageTagForSha(PREV_SHA))).toBe(true);
    expect(retain.has(imageTagForSha(BAD_SHA))).toBe(true);
    expect(retain.size).toBe(6);
  });
});
