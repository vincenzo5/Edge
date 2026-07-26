#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  CONTAINER_DURABLE_MOUNT_PATHS,
  CONTAINER_PRODUCTION_ENV_RELATIVE,
  CONTAINER_COMPOSE_APP_SERVICE_CONTRACT,
  formatComposeAppServiceSummary,
  formatLocalDeployIssues,
  validateComposeAppService,
  type ComposeAppProdFacts,
  type ComposeAppProdMigrateFacts,
  type ComposeAppServiceFacts,
  type ComposeInfraServiceFacts,
} from "./validate-local-deploy.mts";

export type ComposeConfigExec = (
  file: string,
  args: string[],
  options?: { cwd?: string; encoding?: BufferEncoding | null },
) => string;

type ComposeServiceConfig = {
  ports?: Array<string | { host_ip?: string; published?: string | number; target?: number }>;
  env_file?: string | string[] | { path: string; required?: boolean };
  depends_on?: string[] | Record<string, { condition?: string } | null>;
  healthcheck?: { test?: unknown } | null;
  restart?: string | null;
  volumes?: string[] | Array<{ type?: string; source?: string; target?: string }>;
  extra_hosts?: string[] | Record<string, string>;
  logging?: {
    driver?: string;
    options?: Record<string, string>;
  } | null;
  profiles?: string[];
  image?: string;
};

type ComposeConfigJson = {
  services?: Record<string, ComposeServiceConfig>;
};

function defaultExecFile(
  file: string,
  args: string[],
  options?: { cwd?: string; encoding?: BufferEncoding | null },
): string {
  return execFileSync(file, args, {
    cwd: options?.cwd,
    encoding: (options?.encoding ?? "utf8") as BufferEncoding,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  }) as string;
}

function normalizeEnvFiles(value: ComposeServiceConfig["env_file"]): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry === "string") return [entry];
      if (entry && typeof entry === "object" && "path" in entry) return [entry.path];
      return [];
    });
  }
  if (typeof value === "object" && "path" in value) return [value.path];
  return [];
}

function normalizeDependsOn(value: ComposeServiceConfig["depends_on"]): {
  names: string[];
  conditions: Record<string, string | undefined>;
} {
  if (!value) return { names: [], conditions: {} };
  if (Array.isArray(value)) {
    return {
      names: value.map(String),
      conditions: Object.fromEntries(value.map((name) => [name, undefined])),
    };
  }
  const names = Object.keys(value);
  const conditions = Object.fromEntries(
    names.map((name) => {
      const entry = value[name];
      if (entry && typeof entry === "object" && "condition" in entry) {
        return [name, entry.condition];
      }
      return [name, undefined];
    }),
  );
  return { names, conditions };
}

function normalizePortBindings(value: ComposeServiceConfig["ports"]): string[] {
  if (!value) return [];
  return value.map((entry) => {
    if (typeof entry === "string") return entry;
    const host = entry.host_ip ?? "0.0.0.0";
    const published = String(entry.published ?? "");
    const target = String(entry.target ?? published);
    return `${host}:${published}:${target}`;
  });
}

function normalizeDurableMountSource(source: string): string {
  const normalized = source.replace(/\\/g, "/");
  for (const path of CONTAINER_DURABLE_MOUNT_PATHS) {
    if (normalized === path || normalized.endsWith(`/${path}`)) {
      return `./${path}`;
    }
  }
  return normalized.replace(/\/+$/, "");
}

function normalizeVolumeMounts(value: ComposeServiceConfig["volumes"]): {
  sources: string[];
  targets: string[];
} {
  if (!value) return { sources: [], targets: [] };
  const sources: string[] = [];
  const targets: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const [source, target] = entry.split(":");
      if (source) sources.push(normalizeDurableMountSource(source));
      if (target) targets.push(target);
      continue;
    }
    if (entry.source) sources.push(normalizeDurableMountSource(entry.source));
    if (entry.target) targets.push(entry.target);
  }
  return { sources, targets };
}

function normalizeExtraHosts(value: ComposeServiceConfig["extra_hosts"]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).replace("=", ":"));
  }
  return Object.entries(value).map(([host, ip]) => `${host}:${ip}`);
}

export function readComposeSourceEnvFiles(cwd: string): {
  appProd: string[];
  appProdMigrate: string[];
} {
  const content = readFileSync(join(cwd, "docker-compose.yml"), "utf8");
  const extract = (serviceName: string): string[] => {
    const blockMatch = content.match(
      new RegExp(`^  ${serviceName}:[\\s\\S]*?(?=^  [a-z0-9-]+:|^networks:|^volumes:|\\Z)`, "m"),
    );
    if (!blockMatch) return [];
    const envSection = blockMatch[0].match(/env_file:\s*\n((?:\s+-\s+.+\n)+)/);
    if (!envSection) return [];
    return [...envSection[1].matchAll(/-\s+(.+)/g)].map((match) => match[1].trim());
  };
  return {
    appProd: extract(CONTAINER_COMPOSE_APP_SERVICE_CONTRACT.appProdServiceName),
    appProdMigrate: extract(CONTAINER_COMPOSE_APP_SERVICE_CONTRACT.migrateServiceName),
  };
}

function parseAppProdFacts(
  service: ComposeServiceConfig | undefined,
  sourceEnvFiles: string[],
): ComposeAppProdFacts | null {
  if (!service) return null;
  const dependsOn = normalizeDependsOn(service.depends_on);
  const volumes = normalizeVolumeMounts(service.volumes);
  return {
    portBindings: normalizePortBindings(service.ports),
    envFiles: sourceEnvFiles.length > 0 ? sourceEnvFiles : normalizeEnvFiles(service.env_file),
    dependsOn: dependsOn.names,
    dependsOnConditions: dependsOn.conditions,
    hasHealthcheck: Boolean(service.healthcheck?.test),
    restart: service.restart ?? null,
    durableMountSources: volumes.sources,
    durableMountTargets: volumes.targets,
    extraHosts: normalizeExtraHosts(service.extra_hosts),
    loggingDriver: service.logging?.driver ?? null,
    loggingMaxSize: service.logging?.options?.["max-size"] ?? null,
    loggingMaxFile: service.logging?.options?.["max-file"] ?? null,
  };
}

function parseAppProdMigrateFacts(
  service: ComposeServiceConfig | undefined,
  sourceEnvFiles: string[],
): ComposeAppProdMigrateFacts | null {
  if (!service) return null;
  const dependsOn = normalizeDependsOn(service.depends_on);
  return {
    profiles: service.profiles ?? [],
    image: service.image ?? null,
    restart: service.restart ?? null,
    dependsOn: dependsOn.names,
    dependsOnConditions: dependsOn.conditions,
    envFiles: sourceEnvFiles.length > 0 ? sourceEnvFiles : normalizeEnvFiles(service.env_file),
  };
}

function parseInfraFacts(service: ComposeServiceConfig | undefined): ComposeInfraServiceFacts | null {
  if (!service) return null;
  return {
    portBindings: normalizePortBindings(service.ports),
  };
}

export function parseComposeConfigJson(
  config: ComposeConfigJson,
  sourceEnvFiles?: { appProd: string[]; appProdMigrate: string[] },
): ComposeAppServiceFacts {
  const services = config.services ?? {};
  const contract = CONTAINER_COMPOSE_APP_SERVICE_CONTRACT;
  const envFiles = sourceEnvFiles ?? { appProd: [], appProdMigrate: [] };
  return {
    appProd: parseAppProdFacts(services[contract.appProdServiceName], envFiles.appProd),
    appProdMigrate: parseAppProdMigrateFacts(
      services[contract.migrateServiceName],
      envFiles.appProdMigrate,
    ),
    postgres: parseInfraFacts(services.postgres),
    redis: parseInfraFacts(services.redis),
  };
}

export function ensureComposeValidateEnvFile(cwd: string): { createdStub: boolean; path: string } {
  const envPath = join(cwd, CONTAINER_PRODUCTION_ENV_RELATIVE);
  if (existsSync(envPath)) {
    return { createdStub: false, path: envPath };
  }
  mkdirSync(join(cwd, ".edge/local-prod"), { recursive: true });
  writeFileSync(
    envPath,
    [
      "EDGE_APP_HOST=127.0.0.1",
      "EDGE_APP_PORT=3000",
      "DATABASE_URL=postgres://tvai:compose-validate@postgres:5432/edge_prod",
      "REDIS_URL=redis://redis:6379",
      "EDGE_CACHE_ENV=prod",
      "EDGE_REQUIRE_REDIS=1",
      "EDGE_MARKET_DATA_CACHE_BACKEND=redis",
      "EDGE_AUTH_SECRET=compose-validate-secret-abcdefghijklmnopqrstuvwxyz",
      "EDGE_API_AUTH_MODE=key",
      "EDGE_API_KEY=compose-validate-api-key-abcdefghijklmnopqrstuvwxyz",
      "EDGE_ALLOW_OPEN_DEV_SESSION=0",
      "EDGE_READYZ_URL=http://127.0.0.1:3000/readyz",
      "TWS_ENABLED=false",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  return { createdStub: true, path: envPath };
}

export function inspectComposeAppService(
  cwd: string,
  execFile: ComposeConfigExec = defaultExecFile,
  env: Record<string, string> = {
    EDGE_APP_IMAGE: "edge-app:5aa83b921c51a7dadc625101076301ce765ac03d",
  },
): ComposeAppServiceFacts {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    const raw = execFile(
      "docker",
      ["compose", "--profile", "prod", "--profile", "migrate", "config", "--format", "json"],
      {
        cwd,
        encoding: "utf8",
      },
    );
    const config = JSON.parse(raw) as ComposeConfigJson;
    const sourceEnvFiles = readComposeSourceEnvFiles(cwd);
    return parseComposeConfigJson(config, sourceEnvFiles);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

export function runComposeAppServiceInspect(
  cwd = process.cwd(),
  execFile: ComposeConfigExec = defaultExecFile,
  options: { ensureProductionEnv?: boolean } = {},
): number {
  const ensureProductionEnv = options.ensureProductionEnv ?? execFile === defaultExecFile;
  const stub = ensureProductionEnv ? ensureComposeValidateEnvFile(cwd) : { createdStub: false, path: "" };
  let facts: ComposeAppServiceFacts;
  try {
    facts = inspectComposeAppService(cwd, execFile);
  } catch (error) {
    console.error("compose.validate=failed");
    console.error(error instanceof Error ? error.message : "docker compose config failed.");
    return 1;
  } finally {
    if (stub.createdStub) {
      rmSync(stub.path, { force: true });
    }
  }

  for (const line of formatComposeAppServiceSummary(facts)) {
    console.log(line);
  }

  const issues = validateComposeAppService(facts);
  if (issues.length > 0) {
    console.error(`compose.validate=failed issues=${issues.length}`);
    for (const line of formatLocalDeployIssues(issues)) {
      console.error(`- ${line}`);
    }
    return 1;
  }

  console.log("compose.validate=pass");
  return 0;
}

const isMain =
  typeof process.argv[1] === "string" && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const command = process.argv[2]?.trim();
  if (command !== "inspect") {
    console.error("Usage: compose-app-service.mts inspect");
    process.exit(2);
  }
  process.exitCode = runComposeAppServiceInspect();
}
