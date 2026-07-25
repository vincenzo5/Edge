import { describe, expect, it } from "vitest";
import {
  formatLocalDeployIssues,
  formatLocalDeployStatus,
  parseLocalDeployArgs,
  summarizeLocalDeploy,
  validateLocalDeploy,
  type LocalDeployInput,
} from "./validate-local-deploy.mts";

const DEV_ROOT = "/Users/example/TV AI";
const PROD_ROOT = "/Users/example/TV AI-production";
const DEV_SECRET = "dev-secret-abcdefghijklmnopqrstuvwxyz-123";
const PROD_SECRET = "prod-secret-abcdefghijklmnopqrstuvwxyz-456";
const API_KEY = "api-key-abcdefghijklmnopqrstuvwxyz-789";

function validInput(): LocalDeployInput {
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
      TWS_ENABLED: "true",
      TWS_MANAGED: "local",
      TWS_SIDECAR_URL: "http://127.0.0.1:8765",
    },
    developmentRoot: DEV_ROOT,
    productionRoot: PROD_ROOT,
    developmentEnvPath: `${DEV_ROOT}/.env.local`,
    productionEnvPath: `${PROD_ROOT}/.env.production.local`,
    productionEnvFile: { exists: true, mode: 0o600 },
    productionWorktree: {
      exists: true,
      isGitWorktree: true,
      clean: true,
      detached: true,
    },
  };
}

function issueCodes(input: LocalDeployInput): string[] {
  return validateLocalDeploy(input).map((issue) => issue.code);
}

describe("validateLocalDeploy", () => {
  it("accepts the frozen paired-profile contract", () => {
    expect(validateLocalDeploy(validInput())).toEqual([]);
  });

  it.each([
    ["development host", (input: LocalDeployInput) => (input.development.EDGE_APP_HOST = "0.0.0.0"), "development.host"],
    ["development port", (input: LocalDeployInput) => (input.development.EDGE_APP_PORT = "3000"), "development.port"],
    ["development database", (input: LocalDeployInput) => (input.development.DATABASE_URL = "postgres://edge:x@localhost/edge_prod"), "development.database"],
    ["development cache segment", (input: LocalDeployInput) => (input.development.EDGE_CACHE_ENV = "prod"), "development.cache_env"],
    ["development Redis fallback", (input: LocalDeployInput) => (input.development.EDGE_REQUIRE_REDIS = "1"), "development.require_redis"],
    ["development auth mode", (input: LocalDeployInput) => (input.development.EDGE_API_AUTH_MODE = "key"), "development.auth_mode"],
    ["development TWS ownership", (input: LocalDeployInput) => (input.development.TWS_ENABLED = "true"), "development.tws_enabled"],
    ["production host", (input: LocalDeployInput) => (input.production.EDGE_APP_HOST = "0.0.0.0"), "production.host"],
    ["production port", (input: LocalDeployInput) => (input.production.EDGE_APP_PORT = "3003"), "production.port"],
    ["production database", (input: LocalDeployInput) => (input.production.DATABASE_URL = "postgres://edge:x@localhost/edge_dev"), "production.database"],
    ["production cache segment", (input: LocalDeployInput) => (input.production.EDGE_CACHE_ENV = "dev"), "production.cache_env"],
    ["production cache backend", (input: LocalDeployInput) => (input.production.EDGE_MARKET_DATA_CACHE_BACKEND = "memory"), "production.cache_backend"],
    ["production Redis requirement", (input: LocalDeployInput) => (input.production.EDGE_REQUIRE_REDIS = "0"), "production.require_redis"],
    ["production API auth", (input: LocalDeployInput) => (input.production.EDGE_API_AUTH_MODE = "dev-open"), "production.auth_mode"],
    ["production open session", (input: LocalDeployInput) => (input.production.EDGE_ALLOW_OPEN_DEV_SESSION = "1"), "production.open_dev_session"],
    ["production readiness target", (input: LocalDeployInput) => (input.production.EDGE_READYZ_URL = "http://127.0.0.1:3003/readyz"), "production.readyz_url"],
    ["production TWS mode", (input: LocalDeployInput) => (input.production.TWS_MANAGED = "invalid"), "production.tws_managed"],
  ])("rejects unsafe %s", (_name, mutate, expectedCode) => {
    const input = validInput();
    mutate(input);
    expect(issueCodes(input)).toContain(expectedCode);
  });

  it("rejects malformed service URLs without echoing them", () => {
    const input = validInput();
    input.development.DATABASE_URL = "not-a-postgres-url-with-dev-password";
    input.production.REDIS_URL = "not-a-redis-url-with-prod-password";
    input.production.TWS_SIDECAR_URL = "not-a-sidecar-url-with-token";

    const issues = validateLocalDeploy(input);
    const output = formatLocalDeployIssues(issues).join("\n");
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "development.database",
        "production.redis_url",
        "production.tws_sidecar_url",
      ]),
    );
    expect(output).not.toContain("dev-password");
    expect(output).not.toContain("prod-password");
    expect(output).not.toContain("token");
  });

  it("requires strong, distinct auth secrets and an API key", () => {
    const input = validInput();
    input.development.EDGE_AUTH_SECRET = "replace-with-dev-secret";
    input.production.EDGE_AUTH_SECRET = "replace-with-prod-secret";
    input.production.EDGE_API_KEY = "change-me";
    expect(issueCodes(input)).toEqual(
      expect.arrayContaining([
        "development.auth_secret",
        "production.api_key",
        "production.auth_secret",
      ]),
    );

    const reused = validInput();
    reused.production.EDGE_AUTH_SECRET = DEV_SECRET;
    expect(issueCodes(reused)).toContain("shared.auth_secret_reuse");
  });

  it("requires one shared Postgres server and Redis endpoint with isolated names", () => {
    const input = validInput();
    input.production.DATABASE_URL = "postgres://edge:x@db.internal:5432/edge_prod";
    input.production.REDIS_URL = "redis://cache.internal:6379";
    input.production.EDGE_CACHE_ENV = "dev";
    input.production.EDGE_APP_PORT = "3003";
    expect(issueCodes(input)).toEqual(
      expect.arrayContaining([
        "shared.cache_env_collision",
        "shared.port_collision",
        "shared.postgres_server",
        "shared.redis_endpoint",
      ]),
    );
  });

  it("requires isolated runtime roots and canonical environment file locations", () => {
    const input = validInput();
    input.productionRoot = DEV_ROOT;
    input.developmentEnvPath = "/tmp/dev.env";
    input.productionEnvPath = "/tmp/prod.env";
    expect(issueCodes(input)).toEqual(
      expect.arrayContaining([
        "development.env_location",
        "development.env_name",
        "production.env_location",
        "shared.runtime_collision",
      ]),
    );
  });

  it.each([
    ["missing production env", (input: LocalDeployInput) => (input.productionEnvFile = { exists: false, mode: null }), "production.env_missing"],
    ["unsafe production env mode", (input: LocalDeployInput) => (input.productionEnvFile.mode = 0o644), "production.env_permissions"],
    ["missing worktree", (input: LocalDeployInput) => (input.productionWorktree.exists = false), "production.worktree_missing"],
    ["non-git runtime", (input: LocalDeployInput) => (input.productionWorktree.isGitWorktree = false), "production.worktree_missing"],
    ["dirty worktree", (input: LocalDeployInput) => (input.productionWorktree.clean = false), "production.worktree_dirty"],
    ["branch checkout", (input: LocalDeployInput) => (input.productionWorktree.detached = false), "production.worktree_revision"],
  ])("rejects %s", (_name, mutate, expectedCode) => {
    const input = validInput();
    mutate(input);
    expect(issueCodes(input)).toContain(expectedCode);
  });

  it("requires a secret for non-loopback TWS and accepts loopback aliases", () => {
    const input = validInput();
    input.production.TWS_SIDECAR_URL = "https://sidecar.internal:8765";
    expect(issueCodes(input)).toContain("production.tws_sidecar_secret");

    input.production.TWS_SIDECAR_SECRET = "sidecar-secret-abcdefghijklmnopqrstuvwxyz";
    expect(issueCodes(input)).not.toContain("production.tws_sidecar_secret");
  });

  it("returns issues in deterministic code order", () => {
    const input = validInput();
    input.development.EDGE_APP_HOST = "0.0.0.0";
    input.production.EDGE_API_KEY = "";
    input.productionEnvFile.mode = 0o644;
    const codes = issueCodes(input);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
  });
});

describe("local deploy CLI contracts", () => {
  it("parses commands and derives canonical default paths", () => {
    expect(parseLocalDeployArgs(["status"], DEV_ROOT)).toEqual({
      command: "status",
      developmentRoot: DEV_ROOT,
      productionRoot: PROD_ROOT,
      developmentEnvPath: `${DEV_ROOT}/.env.local`,
      productionEnvPath: `${PROD_ROOT}/.env.production.local`,
    });
  });

  it("rejects unknown or incomplete options", () => {
    expect(() => parseLocalDeployArgs(["--unknown", "value"], DEV_ROOT)).toThrow(
      "Unknown option",
    );
    expect(() => parseLocalDeployArgs(["--prod-root"], DEV_ROOT)).toThrow(
      "requires a value",
    );
  });

  it("formats status without URLs or secrets", () => {
    const input = validInput();
    const output = formatLocalDeployStatus(summarizeLocalDeploy(input)).join("\n");
    expect(output).toContain("development: host=127.0.0.1 port=3003 database=edge_dev");
    expect(output).toContain("production: host=127.0.0.1 port=3000 database=edge_prod");
    for (const sensitive of [
      "postgres://",
      "redis://",
      "dev-password",
      "prod-password",
      DEV_SECRET,
      PROD_SECRET,
      API_KEY,
    ]) {
      expect(output).not.toContain(sensitive);
    }
  });
});
