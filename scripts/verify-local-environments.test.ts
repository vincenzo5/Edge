import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  runVerifyScenario,
  scenariosForCommand,
  emptyVerifyState,
  type VerifyLocalEnvironmentsDeps,
  type VerifyLocalEnvironmentsOptions,
} from "./verify-local-environments.mts";
import { type LocalDeployInput } from "./validate-local-deploy.mts";

const DEV_SECRET = "dev-secret-abcdefghijklmnopqrstuvwxyz-123";
const PROD_SECRET = "prod-secret-abcdefghijklmnopqrstuvwxyz-456";
const API_KEY = "api-key-abcdefghijklmnopqrstuvwxyz-789";

function validInput(overrides: Partial<LocalDeployInput> = {}): LocalDeployInput {
  const root = mkdtempSync(join(tmpdir(), "edge-verify-"));
  const devRoot = join(root, "TV AI");
  const prodRoot = join(root, "TV AI-production");
  mkdirSync(devRoot, { recursive: true });
  mkdirSync(prodRoot, { recursive: true });
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

function verifyOptions(input: LocalDeployInput, overrides: Partial<VerifyLocalEnvironmentsOptions> = {}) {
  return {
    command: "status" as const,
    developmentRoot: input.developmentRoot,
    productionRoot: input.productionRoot,
    developmentEnvPath: input.developmentEnvPath,
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

function mockDeps(partial: Partial<VerifyLocalEnvironmentsDeps> = {}): VerifyLocalEnvironmentsDeps {
  const base = defaultVerifyLocalEnvironmentsDeps();
  return {
    ...base,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => "{}"),
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
    execFile: vi.fn((file, args) => {
      if (file === "git" && args.includes("rev-parse")) {
        if (args.some((arg) => String(arg).includes("production"))) return "prodsha111";
        return "devsha222";
      }
      return "";
    }),
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
    expect(scenarios).not.toContain("redis-outage");
  });
});

describe("runConcurrentScenario", () => {
  it("passes when both ports listen and probes succeed", async () => {
    const input = validInput();
    const deps = mockDeps();
    const result = await runConcurrentScenario(verifyOptions(input), deps, input);
    expect(result.pass).toBe(true);
    expect(result.lines.some((line) => line.includes("production.readyz_url_target=3000"))).toBe(true);
  });
});

describe("runBuildIsolationScenario", () => {
  it("passes when production revision and buildId remain stable", async () => {
    const input = validInput();
    mkdirSync(join(input.productionRoot, ".next"), { recursive: true });
    writeFileSync(join(input.productionRoot, ".next", "BUILD_ID"), "build-abc", "utf8");

    const prodRoot = input.productionRoot;
    const deps = mockDeps({
      existsSync: (path) => String(path).includes("BUILD_ID") || true,
      readFileSync: (path) => (String(path).includes("BUILD_ID") ? "build-abc" : "{}"),
      execFile: vi.fn((file, args) => {
        if (file === "git" && args.includes("rev-parse")) {
          return args[1] === prodRoot ? "prodsha" : "devsha";
        }
        return "";
      }),
    });

    const result = await runBuildIsolationScenario(verifyOptions(input), deps);
    expect(result.pass).toBe(true);
  });
});

describe("runBrokerOwnershipScenario", () => {
  it("rejects development TWS ownership by default contract", async () => {
    const input = validInput();
    const deps = mockDeps();
    const result = await runBrokerOwnershipScenario(input, deps);
    expect(result.pass).toBe(true);
    expect(result.lines.some((line) => line.includes("development.tws_enabled_rejected=yes"))).toBe(true);
  });
});

describe("runRebootPrepareScenario", () => {
  it("persists reboot checkpoint state", () => {
    const input = validInput();
    const deps = mockDeps();
    const state = emptyVerifyState("2026-07-26T00:00:00.000Z");
    const result = runRebootPrepareScenario(verifyOptions(input), deps, state);
    expect(result.pass).toBe(true);
    expect(state.rebootPending).toBe(true);
    expect(deps.writeFileSync).toHaveBeenCalled();
  });
});

describe("runRebootResumeScenario", () => {
  it("passes when operational recovery succeeds after reboot prepare", async () => {
    const input = validInput();
    const deps = mockDeps({
      readBootMarker: vi.fn(() => "boot-1"),
      listenPidsOnPort: vi.fn((port) => (port === 3000 ? [333] : [])),
      execFile: vi.fn((file, args) => {
        if (file === "launchctl") return "loaded";
        if (file === "docker") return "running";
        if (file === "git") return "sha";
        return "";
      }),
    });
    const state = emptyVerifyState("2026-07-26T00:00:00.000Z");
    state.rebootPending = true;
    state.rebootBootMarkerBefore = "boot-1";

    const result = await runRebootResumeScenario(verifyOptions(input), deps, state);
    expect(result.pass).toBe(true);
    expect(state.rebootPending).toBe(false);
  });

  it("fails without reboot-prepare checkpoint", async () => {
    const input = validInput();
    const deps = mockDeps();
    const state = emptyVerifyState("2026-07-26T00:00:00.000Z");
    const result = await runRebootResumeScenario(verifyOptions(input), deps, state);
    expect(result.pass).toBe(false);
  });
});

describe("runVerifyScenario disruptive guard", () => {
  it("blocks disruptive scenarios without allow flag", async () => {
    const input = validInput();
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
      "database-isolation",
      "process-recovery",
      "reboot-prepare",
      "reboot-resume",
      "promotion",
      "rollback",
      "broker-ownership",
      "all",
    ]) {
      expect(VERIFY_SCENARIOS).toContain(scenario);
    }
  });
});
