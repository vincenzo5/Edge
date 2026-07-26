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

/** Container successor production contract — Phase 0 freeze; runtime cutover is Phase 3+. */
export const CONTAINER_PRODUCTION_ENV_RELATIVE = ".edge/local-prod/production.env";

export const LOCAL_CONTAINER_PRODUCTION_CONTRACT = {
  host: "127.0.0.1",
  port: 3000,
  database: "edge_prod",
  cacheEnv: "prod",
  postgresHost: "postgres",
  postgresPort: "5432",
  redisHost: "redis",
  redisPort: "6379",
  envRelativePath: CONTAINER_PRODUCTION_ENV_RELATIVE,
  imageNamePrefix: "edge-app:",
  fullGitShaPattern: /^[0-9a-f]{40}$/,
  twsSidecarHost: "host.docker.internal",
} as const;

/** Durable host mounts required for container replacement (Phase 2 wiring). */
export const CONTAINER_DURABLE_MOUNT_PATHS = [
  "data/journal-screenshots",
  "data/copilot-attachments",
] as const;

/** Paths that must never appear in a production runtime image layer. */
export const CONTAINER_FORBIDDEN_IMAGE_PATHS = [
  ".git",
  "node_modules",
  ".env.local",
  ".env.production.local",
  CONTAINER_PRODUCTION_ENV_RELATIVE,
  ".next",
] as const;

/** Frozen Compose app-prod service contract (Phase 2). */
export const CONTAINER_COMPOSE_APP_SERVICE_CONTRACT = {
  appProdServiceName: "app-prod",
  migrateServiceName: "app-prod-migrate",
  migrateProfile: "migrate",
  appPortHost: "127.0.0.1",
  appPort: 3000,
  postgresPortHost: "127.0.0.1",
  postgresPort: 5432,
  redisPortHost: "127.0.0.1",
  redisPort: 6379,
  envFilePath: CONTAINER_PRODUCTION_ENV_RELATIVE,
  appRestartPolicy: "unless-stopped",
  migrateRestartPolicy: "no",
  appDependsOn: ["postgres", "redis"] as const,
  migrateDependsOn: ["postgres"] as const,
  durableMountTargets: [
    "/app/data/journal-screenshots",
    "/app/data/copilot-attachments",
  ] as const,
  extraHostEntry: "host.docker.internal:host-gateway",
  logDriver: "json-file",
  logMaxSize: "10m",
  logMaxFile: "3",
  migrateImageSuffix: "-migrate",
} as const;

export type ComposeAppProdFacts = {
  portBindings: string[];
  envFiles: string[];
  dependsOn: string[];
  dependsOnConditions: Record<string, string | undefined>;
  hasHealthcheck: boolean;
  restart: string | null;
  durableMountSources: string[];
  durableMountTargets: string[];
  extraHosts: string[];
  loggingDriver: string | null;
  loggingMaxSize: string | null;
  loggingMaxFile: string | null;
};

export type ComposeAppProdMigrateFacts = {
  profiles: string[];
  image: string | null;
  restart: string | null;
  dependsOn: string[];
  dependsOnConditions: Record<string, string | undefined>;
  envFiles: string[];
};

export type ComposeInfraServiceFacts = {
  portBindings: string[];
};

export type ComposeAppServiceFacts = {
  appProd: ComposeAppProdFacts | null;
  appProdMigrate: ComposeAppProdMigrateFacts | null;
  postgres: ComposeInfraServiceFacts | null;
  redis: ComposeInfraServiceFacts | null;
};

export type ProductionRuntimeMode = "legacy-worktree" | "container";

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
  runtimeMode?: ProductionRuntimeMode;
};

export type PortOwnershipFacts = {
  legacyLaunchAgentLoaded: boolean;
  containerBoundPort3000: boolean;
};

export type ContainerImageFacts = {
  imageTag: string | null;
  buildContextClean: boolean;
  ociRevisionLabel: string | null;
  forbiddenPathsPresent?: string[];
};

export type ContainerLocalDeployInput = {
  development: Record<string, string>;
  production: Record<string, string>;
  developmentRoot: string;
  productionEnvPath: string;
  productionEnvFile: EnvironmentFileFacts;
  portOwnership?: PortOwnershipFacts;
  imageFacts?: ContainerImageFacts;
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

function postgresHostname(value: string): string | null {
  const parsed = databaseUrl(value);
  return parsed ? parsed.hostname.toLowerCase() : null;
}

function redisHostname(value: string): string | null {
  const parsed = redisUrl(value);
  return parsed ? parsed.hostname.toLowerCase() : null;
}

export function resolveContainerProductionEnvPath(developmentRoot: string): string {
  return join(developmentRoot, CONTAINER_PRODUCTION_ENV_RELATIVE);
}

export function parseImageTagSha(imageTag: string): string | null {
  const prefix = LOCAL_CONTAINER_PRODUCTION_CONTRACT.imageNamePrefix;
  if (!imageTag.startsWith(prefix)) return null;
  const sha = imageTag.slice(prefix.length).trim().toLowerCase();
  return LOCAL_CONTAINER_PRODUCTION_CONTRACT.fullGitShaPattern.test(sha) ? sha : null;
}

function isLoopbackSidecarHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]" || normalized === "::1";
}

function sidecarPort(url: string): number | null {
  try {
    const parsed = new URL(url);
    const port = parsed.port
      ? Number(parsed.port)
      : parsed.protocol === "https:" ? 443 : 80;
    return Number.isFinite(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

function validateDevelopmentTwsWhenEnabled(
  env: Record<string, string>,
  issues: LocalDeployIssue[],
): void {
  if (trimmed(env, "TWS_MANAGED") !== "external") {
    addIssue(
      issues,
      "development.tws_managed",
      "development",
      "TWS_MANAGED",
      "Development TWS_MANAGED must be external when TWS is enabled.",
    );
  }
  if (trimmed(env, "EDGE_TRADING_ENVIRONMENT_LOCK") !== "paper") {
    addIssue(
      issues,
      "development.trading_environment_lock",
      "development",
      "EDGE_TRADING_ENVIRONMENT_LOCK",
      "Development EDGE_TRADING_ENVIRONMENT_LOCK must be paper when TWS is enabled.",
    );
  }
  const sidecar = trimmed(env, "TWS_SIDECAR_URL");
  if (!sidecar) {
    addIssue(
      issues,
      "development.tws_sidecar_url",
      "development",
      "TWS_SIDECAR_URL",
      "Development TWS_SIDECAR_URL is required when TWS is enabled.",
    );
  } else {
    try {
      const hostname = new URL(sidecar).hostname;
      if (!isLoopbackSidecarHostname(hostname)) {
        addIssue(
          issues,
          "development.tws_sidecar_url",
          "development",
          "TWS_SIDECAR_URL",
          "Development TWS_SIDECAR_URL must target loopback when TWS is enabled.",
        );
      }
      if (sidecarPort(sidecar) !== 8765) {
        addIssue(
          issues,
          "development.tws_sidecar_port",
          "development",
          "TWS_SIDECAR_URL",
          "Development TWS_SIDECAR_URL must use port 8765.",
        );
      }
    } catch {
      addIssue(
        issues,
        "development.tws_sidecar_url",
        "development",
        "TWS_SIDECAR_URL",
        "Development TWS_SIDECAR_URL must be a valid URL.",
      );
    }
  }
  if (!secretIsSafe(trimmed(env, "TWS_SIDECAR_SECRET"))) {
    addIssue(
      issues,
      "development.tws_sidecar_secret",
      "development",
      "TWS_SIDECAR_SECRET",
      "Development TWS_SIDECAR_SECRET must be a non-placeholder value of at least 32 characters when TWS is enabled.",
    );
  }
}

function validateContainerProductionTwsWhenEnabled(
  env: Record<string, string>,
  issues: LocalDeployIssue[],
): void {
  if (trimmed(env, "EDGE_TRADING_ENVIRONMENT_LOCK") !== "live") {
    addIssue(
      issues,
      "production.trading_environment_lock",
      "production",
      "EDGE_TRADING_ENVIRONMENT_LOCK",
      "Container production EDGE_TRADING_ENVIRONMENT_LOCK must be live when TWS is enabled.",
    );
  }
  const sidecar = trimmed(env, "TWS_SIDECAR_URL");
  if (!sidecar) {
    addIssue(
      issues,
      "production.tws_sidecar_url",
      "production",
      "TWS_SIDECAR_URL",
      "Container production TWS_SIDECAR_URL is required when TWS is enabled.",
    );
  } else {
    try {
      const parsed = new URL(sidecar);
      if (parsed.hostname.toLowerCase() !== "host.docker.internal") {
        addIssue(
          issues,
          "production.tws_sidecar_url",
          "production",
          "TWS_SIDECAR_URL",
          "Container production TWS_SIDECAR_URL must target host.docker.internal when TWS is enabled.",
        );
      }
      if (sidecarPort(sidecar) !== 8765) {
        addIssue(
          issues,
          "production.tws_sidecar_port",
          "production",
          "TWS_SIDECAR_URL",
          "Container production TWS_SIDECAR_URL must use port 8765.",
        );
      }
    } catch {
      addIssue(
        issues,
        "production.tws_sidecar_url",
        "production",
        "TWS_SIDECAR_URL",
        "Container production TWS_SIDECAR_URL must be a valid URL.",
      );
    }
  }
  if (!secretIsSafe(trimmed(env, "TWS_SIDECAR_SECRET"))) {
    addIssue(
      issues,
      "production.tws_sidecar_secret",
      "production",
      "TWS_SIDECAR_SECRET",
      "Container production TWS_SIDECAR_SECRET must be a non-placeholder value of at least 32 characters when TWS is enabled.",
    );
  }
}

function validateSharedSidecarContract(
  development: Record<string, string>,
  production: Record<string, string>,
  issues: LocalDeployIssue[],
): void {
  const devTws = isTrue(trimmed(development, "TWS_ENABLED"));
  const prodTws = isTrue(trimmed(production, "TWS_ENABLED"));

  if (devTws && prodTws) {
    const devSecret = trimmed(development, "TWS_SIDECAR_SECRET");
    const prodSecret = trimmed(production, "TWS_SIDECAR_SECRET");
    if (devSecret && prodSecret && devSecret !== prodSecret) {
      addIssue(
        issues,
        "shared.tws_sidecar_secret",
        "shared",
        "TWS_SIDECAR_SECRET",
        "Development and production TWS_SIDECAR_SECRET must match for a shared sidecar.",
      );
    }
  }
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
      validateDevelopmentTwsWhenEnabled(env, issues);
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

  validateSharedSidecarContract(input.development, input.production, issues);

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

function validateContainerProductionProfile(
  env: Record<string, string>,
  issues: LocalDeployIssue[],
): void {
  const expected = LOCAL_CONTAINER_PRODUCTION_CONTRACT;
  const host = trimmed(env, "EDGE_APP_HOST");
  const port = trimmed(env, "EDGE_APP_PORT");
  const database = trimmed(env, "DATABASE_URL");
  const cacheEnv = trimmed(env, "EDGE_CACHE_ENV");
  const redis = trimmed(env, "REDIS_URL");

  if (host !== expected.host) {
    addIssue(
      issues,
      "production.host",
      "production",
      "EDGE_APP_HOST",
      "Container production EDGE_APP_HOST must be 127.0.0.1.",
    );
  }
  if (port !== String(expected.port)) {
    addIssue(
      issues,
      "production.port",
      "production",
      "EDGE_APP_PORT",
      `Container production EDGE_APP_PORT must be ${expected.port}.`,
    );
  }

  const parsedDatabaseName = databaseName(database);
  if (parsedDatabaseName !== expected.database) {
    addIssue(
      issues,
      "production.database",
      "production",
      "DATABASE_URL",
      `Container production DATABASE_URL must target database ${expected.database}.`,
    );
  }

  const pgHost = postgresHostname(database);
  if (pgHost !== expected.postgresHost) {
    addIssue(
      issues,
      "production.postgres_host",
      "production",
      "DATABASE_URL",
      `Container production DATABASE_URL must use Compose hostname ${expected.postgresHost}.`,
    );
  }

  const pgPort = databaseUrl(database)?.port || "5432";
  if (pgPort !== expected.postgresPort) {
    addIssue(
      issues,
      "production.postgres_port",
      "production",
      "DATABASE_URL",
      `Container production DATABASE_URL must use port ${expected.postgresPort}.`,
    );
  }

  if (cacheEnv !== expected.cacheEnv) {
    addIssue(
      issues,
      "production.cache_env",
      "production",
      "EDGE_CACHE_ENV",
      `Container production EDGE_CACHE_ENV must be ${expected.cacheEnv}.`,
    );
  }

  if (!redisUrl(redis)) {
    addIssue(
      issues,
      "production.redis_url",
      "production",
      "REDIS_URL",
      "Container production REDIS_URL must be a valid redis or rediss URL.",
    );
  }

  const redisHost = redisHostname(redis);
  if (redisHost !== expected.redisHost) {
    addIssue(
      issues,
      "production.redis_host",
      "production",
      "REDIS_URL",
      `Container production REDIS_URL must use Compose hostname ${expected.redisHost}.`,
    );
  }

  const redisPort = redisUrl(redis)?.port || "6379";
  if (redisPort !== expected.redisPort) {
    addIssue(
      issues,
      "production.redis_port",
      "production",
      "REDIS_URL",
      `Container production REDIS_URL must use port ${expected.redisPort}.`,
    );
  }

  if (!secretIsSafe(trimmed(env, "EDGE_AUTH_SECRET"))) {
    addIssue(
      issues,
      "production.auth_secret",
      "production",
      "EDGE_AUTH_SECRET",
      "Container production EDGE_AUTH_SECRET must be a non-placeholder value of at least 32 characters.",
    );
  }

  if (trimmed(env, "EDGE_MARKET_DATA_CACHE_BACKEND") !== "redis") {
    addIssue(
      issues,
      "production.cache_backend",
      "production",
      "EDGE_MARKET_DATA_CACHE_BACKEND",
      "Container production EDGE_MARKET_DATA_CACHE_BACKEND must be redis.",
    );
  }
  if (!isTrue(trimmed(env, "EDGE_REQUIRE_REDIS"))) {
    addIssue(
      issues,
      "production.require_redis",
      "production",
      "EDGE_REQUIRE_REDIS",
      "Container production EDGE_REQUIRE_REDIS must be enabled explicitly.",
    );
  }
  if (trimmed(env, "EDGE_API_AUTH_MODE") === "dev-open") {
    addIssue(
      issues,
      "production.auth_mode",
      "production",
      "EDGE_API_AUTH_MODE",
      "Container production EDGE_API_AUTH_MODE must not be dev-open.",
    );
  }
  if (!secretIsSafe(trimmed(env, "EDGE_API_KEY"))) {
    addIssue(
      issues,
      "production.api_key",
      "production",
      "EDGE_API_KEY",
      "Container production EDGE_API_KEY must be a non-placeholder value of at least 32 characters.",
    );
  }
  if (!isFalse(trimmed(env, "EDGE_ALLOW_OPEN_DEV_SESSION"))) {
    addIssue(
      issues,
      "production.open_dev_session",
      "production",
      "EDGE_ALLOW_OPEN_DEV_SESSION",
      "Container production EDGE_ALLOW_OPEN_DEV_SESSION must be disabled.",
    );
  }

  const readyz = trimmed(env, "EDGE_READYZ_URL");
  if (readyz !== "http://127.0.0.1:3000/readyz") {
    addIssue(
      issues,
      "production.readyz_url",
      "production",
      "EDGE_READYZ_URL",
      "Container production EDGE_READYZ_URL must target http://127.0.0.1:3000/readyz.",
    );
  }

  if (isTrue(trimmed(env, "TWS_ENABLED"))) {
    const managed = trimmed(env, "TWS_MANAGED");
    if (managed !== "external") {
      addIssue(
        issues,
        "production.tws_managed",
        "production",
        "TWS_MANAGED",
        "Container production TWS_MANAGED must be external when TWS is enabled.",
      );
    }
    validateContainerProductionTwsWhenEnabled(env, issues);
  } else if (trimmed(env, "TWS_MANAGED") === "local") {
    addIssue(
      issues,
      "production.tws_managed",
      "production",
      "TWS_MANAGED",
      "Container production must not use TWS_MANAGED=local.",
    );
  }
}

function validateContainerDevelopmentDependencyHosts(
  env: Record<string, string>,
  issues: LocalDeployIssue[],
): void {
  const database = trimmed(env, "DATABASE_URL");
  const redis = trimmed(env, "REDIS_URL");
  const pgHost = postgresHostname(database);
  if (pgHost && pgHost !== "localhost" && pgHost !== "127.0.0.1") {
    addIssue(
      issues,
      "development.postgres_host",
      "development",
      "DATABASE_URL",
      "Container-paired development DATABASE_URL must use localhost.",
    );
  }
  const redisHost = redisHostname(redis);
  if (redisHost && redisHost !== "localhost" && redisHost !== "127.0.0.1") {
    addIssue(
      issues,
      "development.redis_host",
      "development",
      "REDIS_URL",
      "Container-paired development REDIS_URL must use localhost.",
    );
  }
}

function validateContainerImageFacts(
  imageFacts: ContainerImageFacts | undefined,
  issues: LocalDeployIssue[],
): void {
  if (!imageFacts) return;

  if (!imageFacts.buildContextClean) {
    addIssue(
      issues,
      "container.build_context_dirty",
      "shared",
      "buildContextClean",
      "Production image build context must be clean at the selected revision.",
    );
  }

  const tag = imageFacts.imageTag?.trim() ?? "";
  if (tag) {
    const sha = parseImageTagSha(tag);
    if (!sha) {
      addIssue(
        issues,
        "container.image_tag",
        "shared",
        "imageTag",
        "Production image tag must be edge-app:<full-git-sha>.",
      );
    } else if (
      imageFacts.ociRevisionLabel &&
      imageFacts.ociRevisionLabel.trim().toLowerCase() !== sha
    ) {
      addIssue(
        issues,
        "container.oci_revision_mismatch",
        "shared",
        "ociRevisionLabel",
        "OCI revision label must match the image tag git SHA.",
      );
    }
  }

  const forbidden = imageFacts.forbiddenPathsPresent ?? [];
  for (const path of forbidden) {
    addIssue(
      issues,
      "container.forbidden_image_path",
      "shared",
      "forbiddenPathsPresent",
      `Production runtime image must not include ${path}.`,
    );
  }
}

function validatePortOwnership(
  portOwnership: PortOwnershipFacts | undefined,
  issues: LocalDeployIssue[],
): void {
  if (!portOwnership) return;
  if (portOwnership.legacyLaunchAgentLoaded && portOwnership.containerBoundPort3000) {
    addIssue(
      issues,
      "shared.port_ownership_collision",
      "shared",
      "port3000",
      "Legacy LaunchAgent and container production must not both own port 3000.",
    );
  }
}

/** Validates the host-dev + container-prod paired contract (Phase 0 successor). */
export function validateContainerLocalDeploy(input: ContainerLocalDeployInput): LocalDeployIssue[] {
  const issues: LocalDeployIssue[] = [];
  validateProfile("development", input.development, issues);
  validateContainerDevelopmentDependencyHosts(input.development, issues);
  validateContainerProductionProfile(input.production, issues);

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

  const canonicalEnvPath = resolveContainerProductionEnvPath(input.developmentRoot);
  if (resolve(input.productionEnvPath) !== resolve(canonicalEnvPath)) {
    addIssue(
      issues,
      "production.env_location",
      "production",
      "productionEnvPath",
      `Container production environment file must be ${CONTAINER_PRODUCTION_ENV_RELATIVE} under the development checkout.`,
    );
  }

  if (!input.productionEnvFile.exists) {
    addIssue(
      issues,
      "production.env_missing",
      "production",
      "productionEnvPath",
      "Container production environment file is missing.",
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
      "Container production environment file must not grant group or world permissions.",
    );
  }

  validatePortOwnership(input.portOwnership, issues);
  validateContainerImageFacts(input.imageFacts, issues);
  validateSharedSidecarContract(input.development, input.production, issues);

  return issues.sort((a, b) => a.code.localeCompare(b.code));
}

export function summarizeContainerLocalDeploy(input: ContainerLocalDeployInput): LocalDeploySummary[] {
  const development = summarizeLocalDeploy({
    development: input.development,
    production: input.production,
    developmentRoot: input.developmentRoot,
    productionRoot: input.developmentRoot,
    developmentEnvPath: join(input.developmentRoot, LOCAL_DEPLOY_CONTRACT.development.envFileName),
    productionEnvPath: input.productionEnvPath,
    productionEnvFile: input.productionEnvFile,
    productionWorktree: {
      exists: false,
      isGitWorktree: false,
      clean: false,
      detached: false,
    },
  });
  return development.map((summary) =>
    summary.profile === "production"
      ? { ...summary, runtimeMode: "container" as const }
      : { ...summary, runtimeMode: "container" as const },
  );
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
  return summaries.map((summary) => {
    const runtime = summary.runtimeMode ? ` runtime=${summary.runtimeMode}` : "";
    return `${summary.profile}${runtime}: host=${summary.host} port=${summary.port} database=${summary.database ?? "invalid"} cacheEnv=${summary.cacheEnv ?? "unset"} cacheBackend=${summary.cacheBackend ?? "unset"} tws=${summary.twsEnabled ? "enabled" : "disabled"} auth=${summary.authMode}`;
  });
}

function portBindingMatchesLoopback(
  bindings: string[],
  host: string,
  port: number,
): boolean {
  return bindings.some((binding) => {
    const normalized = binding.trim();
    if (normalized === `${host}:${port}:${port}`) return true;
    const parts = normalized.split(":");
    if (parts.length === 3) {
      return parts[0] === host && Number(parts[1]) === port && Number(parts[2]) === port;
    }
    return false;
  });
}

function normalizeMountSource(source: string): string {
  return source.replace(/\\/g, "/").replace(/\/+$/, "");
}

function expectedDurableMountSources(): string[] {
  return CONTAINER_DURABLE_MOUNT_PATHS.map((path) => normalizeMountSource(`./${path}`)).sort();
}

/** Validates postgres/redis host publishes are loopback-only. */
export function validateComposeInfraPortBindings(
  facts: ComposeAppServiceFacts,
  issues: LocalDeployIssue[],
): void {
  const contract = CONTAINER_COMPOSE_APP_SERVICE_CONTRACT;

  if (!facts.postgres) {
    addIssue(
      issues,
      "postgres.service_missing",
      "shared",
      "postgres",
      "Compose must define a postgres service.",
    );
  } else if (
    !portBindingMatchesLoopback(
      facts.postgres.portBindings,
      contract.postgresPortHost,
      contract.postgresPort,
    )
  ) {
    addIssue(
      issues,
      "postgres.port_binding",
      "shared",
      "postgres.ports",
      `Postgres must publish ${contract.postgresPortHost}:${contract.postgresPort} only.`,
    );
  }

  if (!facts.redis) {
    addIssue(
      issues,
      "redis.service_missing",
      "shared",
      "redis",
      "Compose must define a redis service.",
    );
  } else if (
    !portBindingMatchesLoopback(facts.redis.portBindings, contract.redisPortHost, contract.redisPort)
  ) {
    addIssue(
      issues,
      "redis.port_binding",
      "shared",
      "redis.ports",
      `Redis must publish ${contract.redisPortHost}:${contract.redisPort} only.`,
    );
  }
}

/** Validates app-prod and app-prod-migrate Compose service facts. */
export function validateComposeAppServiceFacts(
  facts: ComposeAppServiceFacts,
  issues: LocalDeployIssue[],
): void {
  const contract = CONTAINER_COMPOSE_APP_SERVICE_CONTRACT;
  const app = facts.appProd;

  if (!app) {
    addIssue(
      issues,
      "app-prod.service_missing",
      "shared",
      "app-prod",
      "Compose must define an app-prod service.",
    );
    return;
  }

  if (!portBindingMatchesLoopback(app.portBindings, contract.appPortHost, contract.appPort)) {
    addIssue(
      issues,
      "app-prod.port_binding",
      "shared",
      "app-prod.ports",
      `app-prod must publish ${contract.appPortHost}:${contract.appPort} only.`,
    );
  }

  const envFiles = app.envFiles.map((entry) => entry.replace(/\\/g, "/"));
  if (!envFiles.includes(contract.envFilePath)) {
    addIssue(
      issues,
      "app-prod.env_file",
      "shared",
      "app-prod.env_file",
      `app-prod env_file must include ${contract.envFilePath}.`,
    );
  }

  for (const dependency of contract.appDependsOn) {
    if (!app.dependsOn.includes(dependency)) {
      addIssue(
        issues,
        "app-prod.depends_on",
        "shared",
        "app-prod.depends_on",
        `app-prod must depend on ${dependency}.`,
      );
    } else if (app.dependsOnConditions[dependency] !== "service_healthy") {
      addIssue(
        issues,
        "app-prod.depends_on_condition",
        "shared",
        "app-prod.depends_on",
        `app-prod depends_on.${dependency} must use condition service_healthy.`,
      );
    }
  }

  if (!app.hasHealthcheck) {
    addIssue(
      issues,
      "app-prod.healthcheck_missing",
      "shared",
      "app-prod.healthcheck",
      "app-prod must define a Docker healthcheck.",
    );
  }

  if (app.restart !== contract.appRestartPolicy) {
    addIssue(
      issues,
      "app-prod.restart_policy",
      "shared",
      "app-prod.restart",
      `app-prod restart must be ${contract.appRestartPolicy}.`,
    );
  }

  const expectedSources = expectedDurableMountSources();
  const actualSources = [...app.durableMountSources]
    .map(normalizeMountSource)
    .sort();
  for (const source of expectedSources) {
    if (!actualSources.includes(source)) {
      addIssue(
        issues,
        "app-prod.durable_mount_missing",
        "shared",
        "app-prod.volumes",
        `app-prod must mount host path ${source}.`,
      );
    }
  }
  for (const source of actualSources) {
    if (!expectedSources.includes(source)) {
      addIssue(
        issues,
        "app-prod.durable_mount_extra",
        "shared",
        "app-prod.volumes",
        `app-prod must not mount unexpected host path ${source}.`,
      );
    }
  }

  const expectedTargets = [...contract.durableMountTargets].sort();
  const actualTargets = [...app.durableMountTargets].sort();
  if (actualTargets.join(",") !== expectedTargets.join(",")) {
    addIssue(
      issues,
      "app-prod.durable_mount_target",
      "shared",
      "app-prod.volumes",
      "app-prod durable mount targets must match the frozen inventory.",
    );
  }

  const hasExtraHost = app.extraHosts.some(
    (entry) => entry.trim() === contract.extraHostEntry,
  );
  if (!hasExtraHost) {
    addIssue(
      issues,
      "app-prod.extra_hosts",
      "shared",
      "app-prod.extra_hosts",
      `app-prod must include extra_hosts entry ${contract.extraHostEntry}.`,
    );
  }

  if (app.loggingDriver !== contract.logDriver) {
    addIssue(
      issues,
      "app-prod.logging_driver",
      "shared",
      "app-prod.logging",
      `app-prod logging driver must be ${contract.logDriver}.`,
    );
  }
  if (app.loggingMaxSize !== contract.logMaxSize) {
    addIssue(
      issues,
      "app-prod.logging_max_size",
      "shared",
      "app-prod.logging",
      `app-prod logging max-size must be ${contract.logMaxSize}.`,
    );
  }
  if (app.loggingMaxFile !== contract.logMaxFile) {
    addIssue(
      issues,
      "app-prod.logging_max_file",
      "shared",
      "app-prod.logging",
      `app-prod logging max-file must be ${contract.logMaxFile}.`,
    );
  }

  const migrate = facts.appProdMigrate;
  if (!migrate) {
    addIssue(
      issues,
      "app-prod-migrate.service_missing",
      "shared",
      "app-prod-migrate",
      "Compose must define an app-prod-migrate service.",
    );
    return;
  }

  if (!migrate.profiles.includes(contract.migrateProfile)) {
    addIssue(
      issues,
      "app-prod-migrate.profile_missing",
      "shared",
      "app-prod-migrate.profiles",
      `app-prod-migrate must use profile ${contract.migrateProfile}.`,
    );
  }

  if (migrate.restart !== contract.migrateRestartPolicy) {
    addIssue(
      issues,
      "app-prod-migrate.restart_policy",
      "shared",
      "app-prod-migrate.restart",
      `app-prod-migrate restart must be ${contract.migrateRestartPolicy}.`,
    );
  }

  for (const dependency of contract.migrateDependsOn) {
    if (!migrate.dependsOn.includes(dependency)) {
      addIssue(
        issues,
        "app-prod-migrate.depends_on",
        "shared",
        "app-prod-migrate.depends_on",
        `app-prod-migrate must depend on ${dependency}.`,
      );
    } else if (migrate.dependsOnConditions[dependency] !== "service_healthy") {
      addIssue(
        issues,
        "app-prod-migrate.depends_on_condition",
        "shared",
        "app-prod-migrate.depends_on",
        `app-prod-migrate depends_on.${dependency} must use condition service_healthy.`,
      );
    }
  }

  const migrateEnvFiles = migrate.envFiles.map((entry) => entry.replace(/\\/g, "/"));
  if (!migrateEnvFiles.includes(contract.envFilePath)) {
    addIssue(
      issues,
      "app-prod-migrate.env_file",
      "shared",
      "app-prod-migrate.env_file",
      `app-prod-migrate env_file must include ${contract.envFilePath}.`,
    );
  }

  const image = migrate.image?.trim() ?? "";
  if (image && !image.endsWith(contract.migrateImageSuffix)) {
    addIssue(
      issues,
      "app-prod-migrate.image_suffix",
      "shared",
      "app-prod-migrate.image",
      `app-prod-migrate image must end with ${contract.migrateImageSuffix}.`,
    );
  }
}

/** Validates the full Compose app-prod contract (infra + app services). */
export function validateComposeAppService(facts: ComposeAppServiceFacts): LocalDeployIssue[] {
  const issues: LocalDeployIssue[] = [];
  validateComposeInfraPortBindings(facts, issues);
  validateComposeAppServiceFacts(facts, issues);
  return issues.sort((a, b) => a.code.localeCompare(b.code));
}

export function formatComposeAppServiceSummary(facts: ComposeAppServiceFacts): string[] {
  const contract = CONTAINER_COMPOSE_APP_SERVICE_CONTRACT;
  const app = facts.appProd;
  const migrate = facts.appProdMigrate;
  const lines = [
    `app-prod.present=${app ? "yes" : "no"}`,
    `app-prod.port=${app?.portBindings.join(",") || "none"}`,
    `app-prod.env_file=${app?.envFiles.join(",") || "none"}`,
    `app-prod.depends_on=${app?.dependsOn.join(",") || "none"}`,
    `app-prod.durableMounts=${app?.durableMountSources.length ?? 0}`,
    `app-prod.extra_hosts=${app?.extraHosts.includes(contract.extraHostEntry) ? "yes" : "no"}`,
    `app-prod-migrate.present=${migrate ? "yes" : "no"}`,
    `app-prod-migrate.profile=${migrate?.profiles.includes(contract.migrateProfile) ? contract.migrateProfile : "missing"}`,
    `app-prod-migrate.image_suffix=${migrate?.image?.endsWith(contract.migrateImageSuffix) ? "yes" : "no"}`,
    `postgres.port=${facts.postgres?.portBindings.join(",") || "none"}`,
    `redis.port=${facts.redis?.portBindings.join(",") || "none"}`,
  ];
  return lines;
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
