import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  DISRUPTIVE_SCENARIOS,
  VERIFY_SCENARIOS,
  defaultVerifyLocalEnvironmentsDeps,
  formatVerifyReport,
  parseVerifyLocalEnvironmentsArgs,
  redactVerifyLine,
  runBrokerOwnershipScenario,
  runBuildIsolationScenario,
  runConcurrentScenario,
  runRebootPrepareScenario,
  runRebootResumeScenario,
  runLegacyRetirementScenario,
  runVerifyScenario,
  scenariosForCommand,
  emptyVerifyState,
  type VerifyLocalEnvironmentsDeps,
  type VerifyLocalEnvironmentsOptions,
} from "./verify-local-environments.mts";
import {
  LOCAL_DEPLOY_CONTRACT,
  parseImageTagSha,
  resolveContainerProductionEnvPath,
  validateContainerLocalDeploy,
  type ContainerLocalDeployInput,
} from "./validate-local-deploy.mts";

const DEV_SECRET = "dev-secret-abcdefghijklmnopqrstuvwxyz-123";
const PROD_SECRET = "prod-secret-abcdefghijklmnopqrstuvwxyz-456";
const API_KEY = "api-key-abcdefghijklmnopqrstuvwxyz-789";

const FULL_SHA = "a".repeat(40);

function validContainerInput(overrides: Partial<ContainerLocalDeployInput> = {}): ContainerLocalDeployInput {
  const root = mkdtempSync(join(tmpdir(), "edge-verify-"));
  const devRoot = join(root, "TV AI");
  mkdirSync(devRoot, { recursive: true });
  mkdirSync(join(devRoot, ".edge", "local-prod"), { recursive: true });
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
      `EDGE_AUTH_SECRET=${DEV_SECRET}`,
      "EDGE_API_AUTH_MODE=dev-open",
      "EDGE_ALLOW_OPEN_DEV_SESSION=1",
      "TWS_ENABLED=false",
    ].join("\n") + "\n",
    "utf8",
  );
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
      `EDGE_AUTH_SECRET=${PROD_SECRET}`,
      "EDGE_API_AUTH_MODE=key",
      `EDGE_API_KEY=${API_KEY}`,
      "EDGE_ALLOW_OPEN_DEV_SESSION=0",
      "EDGE_READYZ_URL=http://127.0.0.1:3000/readyz",
      "TWS_ENABLED=false",
      "TWS_MANAGED=external",
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  writeFileSync(
    join(devRoot, ".edge", "local-prod", "deploy-revisions.json"),
    JSON.stringify(
      {
        currentSha: FULL_SHA,
        previousSha: null,
        pendingSha: null,
        failedSha: null,
        promotedAt: null,
        buildId: "build-abc",
        currentDigest: "edge-app@sha256:abc",
        previousDigest: null,
        pendingDigest: null,
        failedDigest: null,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
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
      DATABASE_URL: "postgres://edge:prod-password@postgres:5432/edge_prod",
      EDGE_MARKET_DATA_CACHE_BACKEND: "redis",
      REDIS_URL: "redis://redis:6379",
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
    productionEnvPath: resolveContainerProductionEnvPath(devRoot),
    productionEnvFile: { exists: true, mode: 0o600 },
    portOwnership: {
      legacyLaunchAgentLoaded: false,
      containerBoundPort3000: true,
    },
    ...overrides,
  };
}

function verifyOptions(input: ContainerLocalDeployInput, overrides: Partial<VerifyLocalEnvironmentsOptions> = {}) {
  const prodRoot = join(dirname(input.developmentRoot), `${basename(input.developmentRoot)}-production`);
  return {
    command: "status" as const,
    developmentRoot: input.developmentRoot,
    productionRoot: prodRoot,
    developmentEnvPath: join(input.developmentRoot, ".env.local"),
    productionEnvPath: input.productionEnvPath,
    revision: null,
    skipInfra: true,
    tailLines: 200,
    scenario: "concurrent" as const,
    allowDisruptive: false,
    revisionGood: null,
    revisionBad: null,
    outputPath: null,
    ...overrides,
  };
}

function mockDockerContainerExec(imageTag = `edge-app:${FULL_SHA}`) {
  return vi.fn((file: string, args: string[]) => {
    if (file === "git" && args.includes("rev-parse")) {
      return "devsha222";
    }
    if (file === "launchctl") {
      throw new Error("not loaded");
    }
    if (file === "docker" && args[0] === "inspect") {
      const target = args.at(-1);
      const formatIndex = args.indexOf("--format");
      const format = formatIndex >= 0 ? String(args[formatIndex + 1]) : "";
      if (target === "edge-app-prod") {
        if (format.includes("State.Status")) return "running";
        if (format.includes("State.Health")) return "healthy";
        if (format.includes("Config.Image")) return imageTag;
      }
    }
    if (file === "docker" && args[0] === "compose") {
      return "running";
    }
    return "";
  });
}

function mockDeps(partial: Partial<VerifyLocalEnvironmentsDeps> = {}): VerifyLocalEnvironmentsDeps {
  const base = defaultVerifyLocalEnvironmentsDeps();
  return {
    ...base,
    existsSync: vi.fn((path) => {
      const value = String(path);
      if (value.includes("deploy-revisions.json")) return true;
      if (value.includes("production.env")) return true;
      return true;
    }),
    readFileSync: vi.fn((path) => {
      const value = String(path);
      if (value.includes("deploy-revisions.json")) {
        return JSON.stringify({
          currentSha: FULL_SHA,
          currentDigest: "edge-app@sha256:abc",
        });
      }
      return "{}";
    }),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    listenPidsOnPort: vi.fn((port: number) => (port === 3003 ? [111] : [222])),
    fetchImpl: vi.fn(async (url: string) => {
      if (url.includes("/healthz")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/readyz")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false }), { status: 503 });
    }) as typeof fetch,
    probeReadyz: vi.fn(async () => ({ ok: true, reasons: [] })),
    execFile: mockDockerContainerExec(),
    readBootMarker: vi.fn(() => "boot-1"),
    now: vi.fn(() => "2026-07-26T00:00:00.000Z"),
    verifyLocalDataIsolation: vi.fn(async () => ({
      pass: true,
      postgres: { devMarkerVisibleInProd: false, prodMarkerVisibleInDev: false, pass: true },
      redis: {
        devKey: "edge:dev:1:md:infra-probe:dev-x",
        prodKey: "edge:prod:1:md:infra-probe:prod-x",
        devValueInProdKey: null,
        prodValueInDevKey: "prod",
        pass: true,
      },
    })),
    verifyPostgresIsolation: vi.fn(async () => ({
      devMarkerVisibleInProd: false,
      prodMarkerVisibleInDev: false,
      pass: true,
    })),
    ...partial,
  };
}

describe("parseVerifyLocalEnvironmentsArgs", () => {
  it("parses scenario subcommand and disruptive flags", () => {
    const options = parseVerifyLocalEnvironmentsArgs([
      "redis-outage",
      "--allow-disruptive",
      "--revision-good",
      "abc123",
      "--revision-bad",
      "bad456",
      "--skip-infra",
    ]);
    expect(options.scenario).toBe("redis-outage");
    expect(options.allowDisruptive).toBe(true);
    expect(options.revisionGood).toBe("abc123");
    expect(options.revisionBad).toBe("bad456");
    expect(options.skipInfra).toBe(true);
  });

  it("parses scenario after allow-disruptive flag", () => {
    const options = parseVerifyLocalEnvironmentsArgs([
      "--allow-disruptive",
      "redis-outage",
      "--skip-infra",
    ]);
    expect(options.scenario).toBe("redis-outage");
    expect(options.allowDisruptive).toBe(true);
  });
});

describe("formatVerifyReport", () => {
  it("redacts secrets from output lines", () => {
    const lines = formatVerifyReport([
      {
        scenario: "concurrent",
        pass: true,
        at: "2026-07-26T00:00:00.000Z",
        lines: [
          "DATABASE_URL=postgres://edge:secret@localhost:5432/edge_dev",
          "EDGE_API_KEY=super-secret-key-value-here",
        ],
      },
    ]);
    expect(lines.join("\n")).not.toContain("secret");
    expect(lines.join("\n")).toContain("[redacted]");
  });
});

describe("redactVerifyLine", () => {
  it("redacts postgres and redis URLs", () => {
    expect(redactVerifyLine("redis://localhost:6379")).toBe("[redacted]");
  });
});

describe("scenariosForCommand", () => {
  it("expands all to non-disruptive matrix", () => {
    const scenarios = scenariosForCommand("all");
    expect(scenarios).toContain("concurrent");
    expect(scenarios).toContain("reboot-prepare");
    expect(scenarios).toContain("security");
    expect(scenarios).toContain("legacy-retirement");
    expect(scenarios).not.toContain("redis-outage");
  });
});

describe("runConcurrentScenario", () => {
  it("passes when both ports listen and probes succeed", async () => {
    const input = validContainerInput();
    const deps = mockDeps();
    const result = await runConcurrentScenario(verifyOptions(input), deps, input);
    expect(result.pass).toBe(true);
    expect(result.lines.some((line) => line.includes("production.readyz_url_target=3000"))).toBe(true);
  });
});

describe("runBuildIsolationScenario", () => {
  it("passes when production image SHA and digest remain stable", async () => {
    const input = validContainerInput();
    const deps = mockDeps({
      execFile: mockDockerContainerExec(`edge-app:${FULL_SHA}`),
    });

    const result = await runBuildIsolationScenario(verifyOptions(input), deps);
    expect(result.pass).toBe(true);
    expect(result.lines.some((line) => line.includes(`production.sha.before=${FULL_SHA}`))).toBe(true);
  });
});

describe("runBrokerOwnershipScenario", () => {
  it("rejects development TWS ownership by default contract", async () => {
    const input = validContainerInput();
    const deps = mockDeps();
    const result = await runBrokerOwnershipScenario(input, deps);
    expect(result.pass).toBe(true);
    expect(result.lines.some((line) => line.includes("development.tws_enabled_rejected=yes"))).toBe(true);
  });
});

describe("runRebootPrepareScenario", () => {
  it("persists reboot checkpoint state", () => {
    const input = validContainerInput();
    const deps = mockDeps();
    const state = emptyVerifyState("2026-07-26T00:00:00.000Z");
    const result = runRebootPrepareScenario(verifyOptions(input), deps, state);
    expect(result.pass).toBe(true);
    expect(state.rebootPending).toBe(true);
    expect(deps.writeFileSync).toHaveBeenCalled();
  });
});

describe("runRebootResumeScenario", () => {
  it("passes when container operational recovery succeeds after reboot prepare", async () => {
    const input = validContainerInput();
    const deps = mockDeps({
      readBootMarker: vi.fn(() => "boot-1"),
      listenPidsOnPort: vi.fn((port) => (port === 3003 ? [] : [222])),
      execFile: mockDockerContainerExec(),
    });
    const state = emptyVerifyState("2026-07-26T00:00:00.000Z");
    state.rebootPending = true;
    state.rebootBootMarkerBefore = "boot-1";
    state.productionRevision = FULL_SHA;

    const result = await runRebootResumeScenario(verifyOptions(input), deps, state);
    expect(result.pass).toBe(true);
    expect(state.rebootPending).toBe(false);
  });

  it("fails without reboot-prepare checkpoint", async () => {
    const input = validContainerInput();
    const deps = mockDeps();
    const state = emptyVerifyState("2026-07-26T00:00:00.000Z");
    const result = await runRebootResumeScenario(verifyOptions(input), deps, state);
    expect(result.pass).toBe(false);
  });
});

describe("runLegacyRetirementScenario", () => {
  it("passes when container owns production and LaunchAgent is absent", async () => {
    const input = validContainerInput();
    const deps = mockDeps();
    const result = await runLegacyRetirementScenario(verifyOptions(input), deps);
    expect(result.pass).toBe(true);
  });
});

describe("runVerifyScenario disruptive guard", () => {
  it("blocks disruptive scenarios without allow flag", async () => {
    const input = validContainerInput();
    const deps = mockDeps();
    const state = emptyVerifyState("2026-07-26T00:00:00.000Z");
    for (const scenario of DISRUPTIVE_SCENARIOS) {
      const result = await runVerifyScenario(
        scenario,
        verifyOptions(input, { allowDisruptive: false }),
        deps,
        input,
        state,
      );
      expect(result.pass).toBe(false);
      expect(result.lines.join("\n")).toContain("requires_allow_disruptive");
    }
  });
});

describe("VERIFY_SCENARIOS registry", () => {
  it("includes roadmap matrix scenarios", () => {
    for (const scenario of [
      "concurrent",
      "build-isolation",
      "isolation",
      "redis-outage",
      "redis-outage",
      "postgres-outage",
      "database-isolation",
      "process-recovery",
      "reboot-prepare",
      "reboot-resume",
      "promotion",
      "rollback",
      "durable-state",
      "security",
      "legacy-retirement",
      "broker-ownership",
      "all",
    ]) {
      expect(VERIFY_SCENARIOS).toContain(scenario);
    }
  });
});
