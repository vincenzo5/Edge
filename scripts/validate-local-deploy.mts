#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "dotenv";

export const LOCAL_DEPLOY_CONTRACT = {
  development: {
    host: "127.0.0.1",
    port: 3003,
    database: "edge_dev",
    cacheEnv: "dev",
    envFileName: ".env.local",
  },
  production: {
    host: "127.0.0.1",
    port: 3000,
    database: "edge_prod",
    cacheEnv: "prod",
    envFileName: ".env.production.local",
  },
} as const;

export type DeployProfile = "development" | "production";

export type EnvironmentFileFacts = {
  mode: number | null;
  exists: boolean;
};

export type WorktreeFacts = {
  exists: boolean;
  isGitWorktree: boolean;
  clean: boolean;
  detached: boolean;
};

export type LocalDeployInput = {
  development: Record<string, string>;
  production: Record<string, string>;
  developmentRoot: string;
  productionRoot: string;
  developmentEnvPath: string;
  productionEnvPath: string;
  productionEnvFile: EnvironmentFileFacts;
  productionWorktree: WorktreeFacts;
};

export type LocalDeployIssue = {
  code: string;
  profile: DeployProfile | "shared";
  field: string;
  message: string;
};

export type LocalDeploySummary = {
  profile: DeployProfile;
  host: string;
  port: number;
  database: string | null;
  cacheEnv: string | null;
  cacheBackend: string | null;
  twsEnabled: boolean;
  authMode: string;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off", ""]);
const PLACEHOLDER_PATTERN = /^(replace-with|change-me|example|placeholder)/i;

function trimmed(env: Record<string, string>, key: string): string {
  return env[key]?.trim() ?? "";
}

function isTrue(value: string): boolean {
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

function isFalse(value: string): boolean {
  return FALSE_VALUES.has(value.trim().toLowerCase());
}

function secretIsSafe(value: string): boolean {
  const normalized = value.trim();
  return normalized.length >= 32 && !PLACEHOLDER_PATTERN.test(normalized);
}

function databaseUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") return null;
    return parsed;
  } catch {
    return null;
  }
}

function databaseName(value: string): string | null {
  const parsed = databaseUrl(value);
  if (!parsed) return null;
  const name = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  return name || null;
}

function redisUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizedRedisEndpoint(value: string): string | null {
  const parsed = redisUrl(value);
  if (!parsed) return null;
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}:${parsed.port || "6379"}${parsed.pathname}`;
}

function postgresServer(value: string): string | null {
  const parsed = databaseUrl(value);
  if (!parsed) return null;
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}`;
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function addIssue(
  issues: LocalDeployIssue[],
  code: string,
  profile: LocalDeployIssue["profile"],
  field: string,
  message: string,
): void {
  issues.push({ code, profile, field, message });
}

function validateProfile(
  profile: DeployProfile,
  env: Record<string, string>,
  issues: LocalDeployIssue[],
): void {
  const expected = LOCAL_DEPLOY_CONTRACT[profile];
  const prefix = profile === "development" ? "Development" : "Production";
  const host = trimmed(env, "EDGE_APP_HOST");
  const port = trimmed(env, "EDGE_APP_PORT");
  const database = trimmed(env, "DATABASE_URL");
  const cacheEnv = trimmed(env, "EDGE_CACHE_ENV");
  const redis = trimmed(env, "REDIS_URL");

  if (host !== expected.host) {
    addIssue(
      issues,
      `${profile}.host`,
      profile,
      "EDGE_APP_HOST",
      `${prefix} EDGE_APP_HOST must be 127.0.0.1.`,
    );
  }
  if (port !== String(expected.port)) {
    addIssue(
      issues,
      `${profile}.port`,
      profile,
      "EDGE_APP_PORT",
      `${prefix} EDGE_APP_PORT must be ${expected.port}.`,
    );
  }

  const parsedDatabaseName = databaseName(database);
  if (parsedDatabaseName !== expected.database) {
    addIssue(
      issues,
      `${profile}.database`,
      profile,
      "DATABASE_URL",
      `${prefix} DATABASE_URL must target database ${expected.database}.`,
    );
  }
  if (cacheEnv !== expected.cacheEnv) {
    addIssue(
      issues,
      `${profile}.cache_env`,
      profile,
      "EDGE_CACHE_ENV",
      `${prefix} EDGE_CACHE_ENV must be ${expected.cacheEnv}.`,
    );
  }
  if (!redisUrl(redis)) {
    addIssue(
      issues,
      `${profile}.redis_url`,
      profile,
      "REDIS_URL",
      `${prefix} REDIS_URL must be a valid redis or rediss URL.`,
    );
  }

  const authSecret = trimmed(env, "EDGE_AUTH_SECRET");
  if (!secretIsSafe(authSecret)) {
    addIssue(
      issues,
      `${profile}.auth_secret`,
      profile,
      "EDGE_AUTH_SECRET",
      `${prefix} EDGE_AUTH_SECRET must be a non-placeholder value of at least 32 characters.`,
    );
  }

  if (profile === "development") {
    const requireRedis = trimmed(env, "EDGE_REQUIRE_REDIS");
    if (!isFalse(requireRedis)) {
      addIssue(
        issues,
        "development.require_redis",
        profile,
        "EDGE_REQUIRE_REDIS",
        "Development EDGE_REQUIRE_REDIS must be disabled.",
      );
    }
    if (trimmed(env, "EDGE_API_AUTH_MODE") !== "dev-open") {
      addIssue(
        issues,
        "development.auth_mode",
        profile,
        "EDGE_API_AUTH_MODE",
        "Development EDGE_API_AUTH_MODE must be dev-open.",
      );
    }
    if (isTrue(trimmed(env, "TWS_ENABLED"))) {
      addIssue(
        issues,
        "development.tws_enabled",
        profile,
        "TWS_ENABLED",
        "Development TWS_ENABLED must be disabled by default.",
      );
    }
    return;
  }

  if (trimmed(env, "EDGE_MARKET_DATA_CACHE_BACKEND") !== "redis") {
    addIssue(
      issues,
      "production.cache_backend",
      profile,
      "EDGE_MARKET_DATA_CACHE_BACKEND",
      "Production EDGE_MARKET_DATA_CACHE_BACKEND must be redis.",
    );
  }
  if (!isTrue(trimmed(env, "EDGE_REQUIRE_REDIS"))) {
    addIssue(
      issues,
      "production.require_redis",
      profile,
      "EDGE_REQUIRE_REDIS",
      "Production EDGE_REQUIRE_REDIS must be enabled explicitly.",
    );
  }
  if (trimmed(env, "EDGE_API_AUTH_MODE") === "dev-open") {
    addIssue(
      issues,
      "production.auth_mode",
      profile,
      "EDGE_API_AUTH_MODE",
      "Production EDGE_API_AUTH_MODE must not be dev-open.",
    );
  }
  if (!secretIsSafe(trimmed(env, "EDGE_API_KEY"))) {
    addIssue(
      issues,
      "production.api_key",
      profile,
      "EDGE_API_KEY",
      "Production EDGE_API_KEY must be a non-placeholder value of at least 32 characters.",
    );
  }
  if (!isFalse(trimmed(env, "EDGE_ALLOW_OPEN_DEV_SESSION"))) {
    addIssue(
      issues,
      "production.open_dev_session",
      profile,
      "EDGE_ALLOW_OPEN_DEV_SESSION",
      "Production EDGE_ALLOW_OPEN_DEV_SESSION must be disabled.",
    );
  }

  const readyz = trimmed(env, "EDGE_READYZ_URL");
  if (readyz !== "http://127.0.0.1:3000/readyz") {
    addIssue(
      issues,
      "production.readyz_url",
      profile,
      "EDGE_READYZ_URL",
      "Production EDGE_READYZ_URL must target http://127.0.0.1:3000/readyz.",
    );
  }

  if (isTrue(trimmed(env, "TWS_ENABLED"))) {
    const managed = trimmed(env, "TWS_MANAGED");
    if (managed !== "local" && managed !== "external") {
      addIssue(
        issues,
        "production.tws_managed",
        profile,
        "TWS_MANAGED",
        "Production TWS_MANAGED must be local or external when TWS is enabled.",
      );
    }
    const sidecar = trimmed(env, "TWS_SIDECAR_URL");
    if (sidecar) {
      try {
        const hostname = new URL(sidecar).hostname;
        const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
        if (!loopback && !secretIsSafe(trimmed(env, "TWS_SIDECAR_SECRET"))) {
          addIssue(
            issues,
            "production.tws_sidecar_secret",
            profile,
            "TWS_SIDECAR_SECRET",
            "Production requires TWS_SIDECAR_SECRET for a non-loopback sidecar.",
          );
        }
      } catch {
        addIssue(
          issues,
          "production.tws_sidecar_url",
          profile,
          "TWS_SIDECAR_URL",
          "Production TWS_SIDECAR_URL must be a valid URL.",
        );
      }
    }
  }
}

export function validateLocalDeploy(input: LocalDeployInput): LocalDeployIssue[] {
  const issues: LocalDeployIssue[] = [];
  validateProfile("development", input.development, issues);
  validateProfile("production", input.production, issues);

  const devPort = trimmed(input.development, "EDGE_APP_PORT");
  const prodPort = trimmed(input.production, "EDGE_APP_PORT");
  if (devPort && devPort === prodPort) {
    addIssue(
      issues,
      "shared.port_collision",
      "shared",
      "EDGE_APP_PORT",
      "Development and production ports must be distinct.",
    );
  }

  const devDatabaseServer = postgresServer(trimmed(input.development, "DATABASE_URL"));
  const prodDatabaseServer = postgresServer(trimmed(input.production, "DATABASE_URL"));
  if (devDatabaseServer && prodDatabaseServer && devDatabaseServer !== prodDatabaseServer) {
    addIssue(
      issues,
      "shared.postgres_server",
      "shared",
      "DATABASE_URL",
      "Development and production must use the same local Postgres server.",
    );
  }

  const devRedis = normalizedRedisEndpoint(trimmed(input.development, "REDIS_URL"));
  const prodRedis = normalizedRedisEndpoint(trimmed(input.production, "REDIS_URL"));
  if (devRedis && prodRedis && devRedis !== prodRedis) {
    addIssue(
      issues,
      "shared.redis_endpoint",
      "shared",
      "REDIS_URL",
      "Development and production must use the same Redis endpoint.",
    );
  }

  if (
    trimmed(input.development, "EDGE_CACHE_ENV") &&
    trimmed(input.development, "EDGE_CACHE_ENV") === trimmed(input.production, "EDGE_CACHE_ENV")
  ) {
    addIssue(
      issues,
      "shared.cache_env_collision",
      "shared",
      "EDGE_CACHE_ENV",
      "Development and production EDGE_CACHE_ENV values must be distinct.",
    );
  }

  const devSecret = trimmed(input.development, "EDGE_AUTH_SECRET");
  const prodSecret = trimmed(input.production, "EDGE_AUTH_SECRET");
  if (devSecret && prodSecret && devSecret === prodSecret) {
    addIssue(
      issues,
      "shared.auth_secret_reuse",
      "shared",
      "EDGE_AUTH_SECRET",
      "Development and production EDGE_AUTH_SECRET values must be distinct.",
    );
  }

  if (resolve(input.developmentRoot) === resolve(input.productionRoot)) {
    addIssue(
      issues,
      "shared.runtime_collision",
      "shared",
      "productionRoot",
      "Production must use a worktree outside the development checkout.",
    );
  }
  if (!isInside(input.developmentRoot, input.developmentEnvPath)) {
    addIssue(
      issues,
      "development.env_location",
      "development",
      "developmentEnvPath",
      "Development environment file must be inside the development checkout.",
    );
  }
  if (
    resolve(input.developmentEnvPath) !==
    resolve(input.developmentRoot, LOCAL_DEPLOY_CONTRACT.development.envFileName)
  ) {
    addIssue(
      issues,
      "development.env_name",
      "development",
      "developmentEnvPath",
      "Development environment file must be named .env.local at the checkout root.",
    );
  }
  if (
    !isInside(input.productionRoot, input.productionEnvPath) ||
    resolve(input.productionEnvPath) !==
      resolve(input.productionRoot, LOCAL_DEPLOY_CONTRACT.production.envFileName)
  ) {
    addIssue(
      issues,
      "production.env_location",
      "production",
      "productionEnvPath",
      "Production environment file must be .env.production.local at the worktree root.",
    );
  }

  if (!input.productionEnvFile.exists) {
    addIssue(
      issues,
      "production.env_missing",
      "production",
      "productionEnvPath",
      "Production environment file is missing.",
    );
  } else if (
    input.productionEnvFile.mode === null ||
    (input.productionEnvFile.mode & 0o077) !== 0
  ) {
    addIssue(
      issues,
      "production.env_permissions",
      "production",
      "productionEnvPath",
      "Production environment file must not grant group or world permissions.",
    );
  }

  if (!input.productionWorktree.exists || !input.productionWorktree.isGitWorktree) {
    addIssue(
      issues,
      "production.worktree_missing",
      "production",
      "productionRoot",
      "Production root must be a dedicated Git worktree.",
    );
  } else {
    if (!input.productionWorktree.clean) {
      addIssue(
        issues,
        "production.worktree_dirty",
        "production",
        "productionRoot",
        "Production worktree must be clean.",
      );
    }
    if (!input.productionWorktree.detached) {
      addIssue(
        issues,
        "production.worktree_revision",
        "production",
        "productionRoot",
        "Production worktree must be detached at an explicit commit or tag.",
      );
    }
  }

  return issues.sort((a, b) => a.code.localeCompare(b.code));
}

export function summarizeLocalDeploy(input: LocalDeployInput): LocalDeploySummary[] {
  return (["development", "production"] as const).map((profile) => {
    const env = input[profile];
    const contract = LOCAL_DEPLOY_CONTRACT[profile];
    const authMode =
      profile === "development"
        ? trimmed(env, "EDGE_API_AUTH_MODE") || "closed"
        : trimmed(env, "EDGE_API_AUTH_MODE") === "dev-open"
          ? "unsafe-dev-open"
          : "closed";
    return {
      profile,
      host: contract.host,
      port: contract.port,
      database: databaseName(trimmed(env, "DATABASE_URL")),
      cacheEnv: trimmed(env, "EDGE_CACHE_ENV") || null,
      cacheBackend: trimmed(env, "EDGE_MARKET_DATA_CACHE_BACKEND") || null,
      twsEnabled: isTrue(trimmed(env, "TWS_ENABLED")),
      authMode,
    };
  });
}

export function formatLocalDeployIssues(issues: LocalDeployIssue[]): string[] {
  return issues.map((issue) => `[${issue.code}] ${issue.message}`);
}

export function formatLocalDeployStatus(summaries: LocalDeploySummary[]): string[] {
  return summaries.map(
    (summary) =>
      `${summary.profile}: host=${summary.host} port=${summary.port} database=${summary.database ?? "invalid"} cacheEnv=${summary.cacheEnv ?? "unset"} cacheBackend=${summary.cacheBackend ?? "unset"} tws=${summary.twsEnabled ? "enabled" : "disabled"} auth=${summary.authMode}`,
  );
}

function readEnvironmentFile(path: string): Record<string, string> {
  return parse(readFileSync(path));
}

function environmentFileFacts(path: string): EnvironmentFileFacts {
  if (!existsSync(path)) return { exists: false, mode: null };
  return { exists: true, mode: statSync(path).mode & 0o777 };
}

function worktreeFacts(path: string): WorktreeFacts {
  if (!existsSync(path)) {
    return { exists: false, isGitWorktree: false, clean: false, detached: false };
  }
  const gitMarker = join(path, ".git");
  if (!existsSync(gitMarker)) {
    return { exists: true, isGitWorktree: false, clean: false, detached: false };
  }
  try {
    const status = execFileSync("git", ["-C", path, "status", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    let detached = false;
    try {
      execFileSync("git", ["-C", path, "symbolic-ref", "-q", "HEAD"], {
        stdio: "ignore",
      });
    } catch {
      detached = true;
    }
    return {
      exists: true,
      isGitWorktree: true,
      clean: status.trim() === "",
      detached,
    };
  } catch {
    return { exists: true, isGitWorktree: false, clean: false, detached: false };
  }
}

type CliOptions = {
  command: "preflight" | "status";
  developmentRoot: string;
  productionRoot: string;
  developmentEnvPath: string;
  productionEnvPath: string;
};

function defaultProductionRoot(developmentRoot: string): string {
  return resolve(developmentRoot, "..", `${basename(developmentRoot)}-production`);
}

export function parseLocalDeployArgs(argv: string[], cwd = process.cwd()): CliOptions {
  const args = [...argv];
  let command: CliOptions["command"] = "preflight";
  if (args[0] === "preflight" || args[0] === "status") {
    command = args.shift() as CliOptions["command"];
  }

  let developmentRoot = resolve(cwd);
  let productionRoot = defaultProductionRoot(developmentRoot);
  let developmentEnvPath: string | null = null;
  let productionEnvPath: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag ?? "argument"} requires a value`);
    }
    if (flag === "--dev-root") {
      developmentRoot = resolve(value);
    } else if (flag === "--prod-root") {
      productionRoot = resolve(value);
    } else if (flag === "--dev-env") {
      developmentEnvPath = resolve(value);
    } else if (flag === "--prod-env") {
      productionEnvPath = resolve(value);
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
    index += 1;
  }

  if (!developmentEnvPath) {
    developmentEnvPath = join(developmentRoot, LOCAL_DEPLOY_CONTRACT.development.envFileName);
  }
  if (!productionEnvPath) {
    productionEnvPath = join(productionRoot, LOCAL_DEPLOY_CONTRACT.production.envFileName);
  }

  return {
    command,
    developmentRoot,
    productionRoot,
    developmentEnvPath,
    productionEnvPath,
  };
}

function loadCliInput(options: CliOptions): LocalDeployInput {
  let development: Record<string, string> = {};
  let production: Record<string, string> = {};
  try {
    development = readEnvironmentFile(options.developmentEnvPath);
  } catch {
    // Missing/unreadable files are reported using fixed validation messages below.
  }
  try {
    production = readEnvironmentFile(options.productionEnvPath);
  } catch {
    // Missing/unreadable files are reported using fixed validation messages below.
  }

  return {
    development,
    production,
    developmentRoot: options.developmentRoot,
    productionRoot: options.productionRoot,
    developmentEnvPath: options.developmentEnvPath,
    productionEnvPath: options.productionEnvPath,
    productionEnvFile: environmentFileFacts(options.productionEnvPath),
    productionWorktree: worktreeFacts(options.productionRoot),
  };
}

export function runLocalDeployCli(argv: string[], cwd = process.cwd()): number {
  let options: CliOptions;
  try {
    options = parseLocalDeployArgs(argv, cwd);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    return 2;
  }

  const input = loadCliInput(options);
  const issues = validateLocalDeploy(input);

  if (options.command === "status") {
    for (const line of formatLocalDeployStatus(summarizeLocalDeploy(input))) {
      console.log(line);
    }
  }

  if (issues.length > 0) {
    console.error(`Local deployment preflight failed (${issues.length} issues):`);
    for (const line of formatLocalDeployIssues(issues)) {
      console.error(`- ${line}`);
    }
    return 1;
  }

  console.log("Local deployment preflight passed: profiles=2 issues=0");
  return 0;
}

const isMain =
  typeof process.argv[1] === "string" && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  process.exitCode = runLocalDeployCli(process.argv.slice(2));
}
