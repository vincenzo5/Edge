#!/usr/bin/env npx tsx

import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parse } from "dotenv";

import { probeReadyz } from "../src/lib/observability/readyzProbe.ts";
import { loadProfileEnvIntoProcess } from "./load-deploy-env.mts";
import { runLocalInfraUp } from "./local-data-infrastructure.mts";
import { waitForPostgres } from "./wait-for-postgres.mts";
import {
  LOCAL_DEPLOY_CONTRACT,
  formatLocalDeployIssues,
  formatLocalDeployStatus,
  runLocalDeployCli,
  summarizeLocalDeploy,
  validateLocalDeploy,
  type LocalDeployInput,
} from "./validate-local-deploy.mts";

export const LOCAL_PROD_RUNTIME_DIR = ".edge/local-prod";
export const LOCAL_PROD_PID_FILE = "local-prod.pid";
export const LOCAL_PROD_META_FILE = "local-prod.meta.json";
export const LOCAL_PROD_LOG_FILE = "local-prod.log";

export type LocalProdCommand =
  | "setup"
  | "preflight"
  | "migrate"
  | "build"
  | "start"
  | "stop"
  | "status";

export type LocalProdRuntimeMeta = {
  pid: number;
  startedAt: string;
  revision: string;
  buildId: string | null;
  host: string;
  port: number;
  logPath: string;
};

export type LocalProdOptions = {
  command: LocalProdCommand;
  developmentRoot: string;
  productionRoot: string;
  developmentEnvPath: string;
  productionEnvPath: string;
  revision: string | null;
  skipInfra: boolean;
};

export type LocalProdExec = (
  file: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) => string;

export type LocalProdDeps = {
  execFile: LocalProdExec;
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  mkdirSync: typeof mkdirSync;
  unlinkSync: typeof unlinkSync;
  probeReadyz: typeof probeReadyz;
  spawnProcess: typeof spawn;
  killProcess: (pid: number, signal?: NodeJS.Signals) => boolean;
  processAlive: (pid: number) => boolean;
  listenPidsOnPort: (port: number) => number[];
  fetchImpl: typeof fetch;
};

const HELP_TEXT = `Local production runtime wrapper.

Commands:
  setup      Create detached production worktree (--revision required)
  preflight  Validate paired dev/prod profiles
  migrate    Apply migrations to edge_prod
  build      Install deps and next build in production worktree
  start      Start next start on 127.0.0.1:3000 (background)
  stop       Stop the managed production process
  status     Print runtime identity and readiness

Options:
  --dev-root <path>     Development checkout (default: cwd)
  --prod-root <path>    Production worktree (default: sibling *-production)
  --dev-env <path>      Development env file override
  --prod-env <path>     Production env file override
  --revision <sha>      Git commit/tag for setup (required for setup)
  --skip-infra          Skip docker compose up before migrate/start

Examples:
  npm run local:prod:setup -- --revision HEAD
  npm run local:prod:preflight
  npm run local:prod:migrate
  npm run local:prod:build
  npm run local:prod:start
  npm run local:prod:status
  npm run local:prod:stop
`;

function defaultExecFile(
  file: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): string {
  return execFileSync(file, args, {
    cwd: options?.cwd,
    env: options?.env ?? process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function defaultListenPidsOnPort(port: number): number[] {
  try {
    const output = execFileSync("lsof", ["-iTCP:" + String(port), "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) return [];
    return output
      .split("\n")
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isFinite(pid) && pid > 0);
  } catch {
    return [];
  }
}

export function defaultLocalProdDeps(): LocalProdDeps {
  return {
    execFile: defaultExecFile,
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    unlinkSync,
    probeReadyz,
    spawnProcess: spawn,
    killProcess: (pid, signal = "TERM") => {
      try {
        process.kill(pid, signal);
        return true;
      } catch {
        return false;
      }
    },
    processAlive: (pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    },
    listenPidsOnPort: defaultListenPidsOnPort,
    fetchImpl: fetch,
  };
}

function defaultProductionRoot(developmentRoot: string): string {
  return resolve(developmentRoot, "..", `${basename(developmentRoot)}-production`);
}

export function parseLocalProdArgs(argv: string[], cwd = process.cwd()): LocalProdOptions {
  const args = [...argv];
  let command: LocalProdCommand | null = null;
  const knownCommands: LocalProdCommand[] = [
    "setup",
    "preflight",
    "migrate",
    "build",
    "start",
    "stop",
    "status",
  ];
  if (args[0] && knownCommands.includes(args[0] as LocalProdCommand)) {
    command = args.shift() as LocalProdCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new HelpRequestedError();
    }
    throw new Error("Missing command. Use: setup | preflight | migrate | build | start | stop | status");
  }

  let developmentRoot = resolve(cwd);
  let productionRoot = defaultProductionRoot(developmentRoot);
  let developmentEnvPath: string | null = null;
  let productionEnvPath: string | null = null;
  let revision: string | null = null;
  let skipInfra = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new HelpRequestedError();
    }
    if (flag === "--skip-infra") {
      skipInfra = true;
      continue;
    }
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
    } else if (flag === "--revision") {
      revision = value;
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
    revision,
    skipInfra,
  };
}

export class HelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "HelpRequestedError";
  }
}

export function readWorktreeFacts(
  path: string,
  execFile: LocalProdExec = defaultExecFile,
): LocalDeployInput["productionWorktree"] {
  if (!existsSync(path)) {
    return { exists: false, isGitWorktree: false, clean: false, detached: false };
  }
  const gitMarker = join(path, ".git");
  if (!existsSync(gitMarker)) {
    return { exists: true, isGitWorktree: false, clean: false, detached: false };
  }
  try {
    const status = execFile("git", ["-C", path, "status", "--porcelain"]);
    let detached = false;
    try {
      execFile("git", ["-C", path, "symbolic-ref", "-q", "HEAD"]);
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

export function readWorktreeRevision(
  productionRoot: string,
  execFile: LocalProdExec = defaultExecFile,
): string | null {
  if (!existsSync(productionRoot)) return null;
  try {
    return execFile("git", ["-C", productionRoot, "rev-parse", "HEAD"]);
  } catch {
    return null;
  }
}

export function readBuildId(
  productionRoot: string,
  deps: Pick<LocalProdDeps, "existsSync" | "readFileSync">,
): string | null {
  const buildIdPath = join(productionRoot, ".next", "BUILD_ID");
  if (!deps.existsSync(buildIdPath)) return null;
  try {
    return deps.readFileSync(buildIdPath, "utf8").trim() || null;
  } catch {
    return null;
  }
}

function runtimePaths(developmentRoot: string) {
  const dir = join(developmentRoot, LOCAL_PROD_RUNTIME_DIR);
  return {
    dir,
    pidPath: join(dir, LOCAL_PROD_PID_FILE),
    metaPath: join(dir, LOCAL_PROD_META_FILE),
    logPath: join(dir, LOCAL_PROD_LOG_FILE),
  };
}

export function readRuntimeMeta(
  developmentRoot: string,
  deps: Pick<LocalProdDeps, "existsSync" | "readFileSync">,
): LocalProdRuntimeMeta | null {
  const { metaPath } = runtimePaths(developmentRoot);
  if (!deps.existsSync(metaPath)) return null;
  try {
    const parsed = JSON.parse(deps.readFileSync(metaPath, "utf8")) as LocalProdRuntimeMeta;
    if (typeof parsed.pid !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRuntimeMeta(
  developmentRoot: string,
  meta: LocalProdRuntimeMeta,
  deps: Pick<LocalProdDeps, "mkdirSync" | "writeFileSync">,
): void {
  const { dir, metaPath } = runtimePaths(developmentRoot);
  deps.mkdirSync(dir, { recursive: true });
  deps.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
}

function clearRuntimeState(
  developmentRoot: string,
  deps: Pick<LocalProdDeps, "existsSync" | "unlinkSync">,
): void {
  const { pidPath, metaPath } = runtimePaths(developmentRoot);
  if (deps.existsSync(pidPath)) deps.unlinkSync(pidPath);
  if (deps.existsSync(metaPath)) deps.unlinkSync(metaPath);
}

export function loadDeployInputSync(options: LocalProdOptions, deps: LocalProdDeps): LocalDeployInput {
  let development: Record<string, string> = {};
  let production: Record<string, string> = {};
  try {
    development = parse(
      deps.existsSync(options.developmentEnvPath)
        ? deps.readFileSync(options.developmentEnvPath, "utf8")
        : "",
    );
  } catch {
    development = {};
  }
  try {
    production = parse(
      deps.existsSync(options.productionEnvPath)
        ? deps.readFileSync(options.productionEnvPath, "utf8")
        : "",
    );
  } catch {
    production = {};
  }

  let productionEnvFile = { exists: false, mode: null as number | null };
  if (deps.existsSync(options.productionEnvPath)) {
    productionEnvFile = { exists: true, mode: statSync(options.productionEnvPath).mode & 0o777 };
  }

  return {
    development,
    production,
    developmentRoot: options.developmentRoot,
    productionRoot: options.productionRoot,
    developmentEnvPath: options.developmentEnvPath,
    productionEnvPath: options.productionEnvPath,
    productionEnvFile,
    productionWorktree: readWorktreeFacts(options.productionRoot, deps.execFile),
  };
}

export function runPreflightCheck(input: LocalDeployInput): number {
  const issues = validateLocalDeploy(input);
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

export async function runSetupCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  if (!options.revision) {
    console.error("Error: --revision is required for setup.");
    console.error("  npm run local:prod:setup -- --revision <sha>");
    return 2;
  }

  const revision = options.revision;
  if (deps.existsSync(options.productionRoot)) {
    const current = readWorktreeRevision(options.productionRoot, deps.execFile);
    const facts = readWorktreeFacts(options.productionRoot, deps.execFile);
    if (facts.isGitWorktree && current === revision && facts.detached) {
      console.log(`production.worktree=exists revision=${current} status=unchanged`);
      console.log(
        `Next: create ${LOCAL_DEPLOY_CONTRACT.production.envFileName} in the worktree and run chmod 600`,
      );
      return 0;
    }
    console.error(
      `Production worktree already exists at ${options.productionRoot} with revision=${current ?? "unknown"}.`,
    );
    console.error(`Requested revision=${revision}. Remove the worktree or choose a matching revision.`);
    return 1;
  }

  deps.mkdirSync(resolve(options.productionRoot, ".."), { recursive: true });
  deps.execFile(
    "git",
    ["worktree", "add", "--detach", options.productionRoot, revision],
    { cwd: options.developmentRoot },
  );

  const createdRevision = readWorktreeRevision(options.productionRoot, deps.execFile);
  console.log(`production.worktree=created revision=${createdRevision ?? revision}`);
  console.log(
    `Next: copy production keys from .env.example to ${options.productionRoot}/${LOCAL_DEPLOY_CONTRACT.production.envFileName}, then chmod 600`,
  );
  return 0;
}

function ensureSharedInfra(skipInfra: boolean): number {
  if (skipInfra) return 0;
  try {
    return runLocalInfraUp();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}

export async function runMigrateCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  const input = loadDeployInputSync(options, deps);
  const preflight = runPreflightCheck(input);
  if (preflight !== 0) return preflight;

  const infra = ensureSharedInfra(options.skipInfra);
  if (infra !== 0) return infra;

  loadProfileEnvIntoProcess(options.productionRoot, "production");
  await waitForPostgres({ databaseUrl: process.env.DATABASE_URL });
  deps.execFile(
    "npx",
    ["tsx", join(options.developmentRoot, "scripts/db-migrate.mts"), "--env-file", options.productionEnvPath],
    {
      cwd: options.developmentRoot,
      env: process.env,
    },
  );
  console.log("Production migrations complete.");
  return 0;
}

export async function runBuildCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  const input = loadDeployInputSync(options, deps);
  const preflight = runPreflightCheck(input);
  if (preflight !== 0) return preflight;

  if (!deps.existsSync(options.productionRoot)) {
    console.error("Production worktree is missing. Run: npm run local:prod:setup -- --revision <sha>");
    return 1;
  }

  loadProfileEnvIntoProcess(options.productionRoot, "production");
  const installEnv = { ...process.env, NODE_ENV: "development" };
  deps.execFile("npm", ["ci"], { cwd: options.productionRoot, env: installEnv });
  const buildEnv = { ...process.env, NODE_ENV: "production" };
  deps.execFile("npm", ["run", "build:packages"], { cwd: options.productionRoot, env: buildEnv });
  deps.execFile("npm", ["run", "build"], { cwd: options.productionRoot, env: buildEnv });

  const revision = readWorktreeRevision(options.productionRoot, deps.execFile);
  const buildId = readBuildId(options.productionRoot, deps);
  console.log(`production.build=pass revision=${revision ?? "unknown"} buildId=${buildId ?? "missing"}`);
  return 0;
}

export async function runStartCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  const input = loadDeployInputSync(options, deps);
  const preflight = runPreflightCheck(input);
  if (preflight !== 0) return preflight;

  const buildIdPath = join(options.productionRoot, ".next", "BUILD_ID");
  if (!deps.existsSync(buildIdPath)) {
    console.error("Production build is missing. Run: npm run local:prod:build");
    return 1;
  }

  const port = LOCAL_DEPLOY_CONTRACT.production.port;
  const host = LOCAL_DEPLOY_CONTRACT.production.host;
  const existingMeta = readRuntimeMeta(options.developmentRoot, deps);
  if (existingMeta && deps.processAlive(existingMeta.pid)) {
    console.error(`Managed production process already running (pid=${existingMeta.pid}).`);
    return 1;
  }

  const listeners = deps.listenPidsOnPort(port);
  if (listeners.length > 0) {
    console.error(
      `Port ${port} is in use by unmanaged process(es): ${listeners.join(", ")}. Stop them manually before starting production.`,
    );
    return 1;
  }

  const infra = ensureSharedInfra(options.skipInfra);
  if (infra !== 0) return infra;

  loadProfileEnvIntoProcess(options.productionRoot, "production");
  const { dir, pidPath, logPath } = runtimePaths(options.developmentRoot);
  deps.mkdirSync(dir, { recursive: true });

  const revision = readWorktreeRevision(options.productionRoot, deps.execFile);
  const buildId = readBuildId(options.productionRoot, deps);
  const child = deps.spawnProcess(
    "npm",
    ["run", "start", "--", "-H", host, "-p", String(port)],
    {
      cwd: options.productionRoot,
      env: { ...process.env, NODE_ENV: "production" },
      detached: true,
      stdio: ["ignore", "open", logPath],
    },
  );

  if (!child.pid) {
    console.error("Failed to start production process.");
    return 1;
  }

  child.unref();
  const meta: LocalProdRuntimeMeta = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    revision: revision ?? "unknown",
    buildId,
    host,
    port,
    logPath,
  };
  writeRuntimeMeta(options.developmentRoot, meta, deps);
  deps.writeFileSync(pidPath, String(child.pid) + "\n", "utf8");

  await new Promise((resolveSleep) => setTimeout(resolveSleep, 1500));

  const readyzUrl = process.env.EDGE_READYZ_URL?.trim() || `http://${host}:${port}/readyz`;
  const ready = await deps.probeReadyz(readyzUrl, deps.fetchImpl);
  console.log(
    `production.start=pass pid=${child.pid} revision=${meta.revision} buildId=${buildId ?? "missing"} readyz=${ready.ok ? "pass" : "pending"}`,
  );
  if (!ready.ok) {
    console.error(`Readiness pending: ${ready.reasons.join(", ") || "unknown"}`);
  }
  return 0;
}

export async function runStopCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  const meta = readRuntimeMeta(options.developmentRoot, deps);
  if (!meta) {
    console.log("production.stop=noop reason=no-managed-process");
    return 0;
  }

  if (!deps.processAlive(meta.pid)) {
    clearRuntimeState(options.developmentRoot, deps);
    console.log("production.stop=noop reason=stale-pid");
    return 0;
  }

  deps.killProcess(meta.pid, "TERM");
  await new Promise((resolveSleep) => setTimeout(resolveSleep, 1000));
  if (deps.processAlive(meta.pid)) {
    deps.killProcess(meta.pid, "KILL");
  }

  clearRuntimeState(options.developmentRoot, deps);
  console.log(`production.stop=pass pid=${meta.pid}`);
  return 0;
}

export async function runStatusCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  const input = loadDeployInputSync(options, deps);
  const summaries = summarizeLocalDeploy(input);
  for (const line of formatLocalDeployStatus(summaries)) {
    console.log(line);
  }

  const devRevision = readWorktreeRevision(options.developmentRoot, deps.execFile);
  const prodRevision = readWorktreeRevision(options.productionRoot, deps.execFile);
  const prodBuildId = readBuildId(options.productionRoot, deps);
  const meta = readRuntimeMeta(options.developmentRoot, deps);
  const port = LOCAL_DEPLOY_CONTRACT.production.port;
  const listeners = deps.listenPidsOnPort(port);

  let managed = "stopped";
  let pid: number | null = null;
  if (meta && deps.processAlive(meta.pid)) {
    managed = "running";
    pid = meta.pid;
  } else if (meta) {
    managed = "stale";
  }

  const host = LOCAL_DEPLOY_CONTRACT.production.host;
  const readyzUrl = input.production.EDGE_READYZ_URL?.trim() || `http://${host}:${port}/readyz`;
  const ready =
    managed === "running" ? await deps.probeReadyz(readyzUrl, deps.fetchImpl) : null;

  console.log(
    `development: revision=${devRevision ?? "unknown"} mode=dev port=${LOCAL_DEPLOY_CONTRACT.development.port}`,
  );
  console.log(
    `production: revision=${prodRevision ?? "unknown"} buildId=${prodBuildId ?? "missing"} mode=start port=${port} managed=${managed} pid=${pid ?? "none"} listeners=${listeners.join(",") || "none"}`,
  );
  if (ready) {
    console.log(
      `production.readyz=${ready.ok ? "pass" : "fail"} reasons=${ready.reasons.join(",") || "none"}`,
    );
  }

  const issues = validateLocalDeploy(input);
  if (issues.length > 0) {
    console.error(`Local deployment preflight failed (${issues.length} issues):`);
    for (const line of formatLocalDeployIssues(issues)) {
      console.error(`- ${line}`);
    }
    return 1;
  }
  return 0;
}

export async function runLocalProdCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps = defaultLocalProdDeps(),
): Promise<number> {
  switch (options.command) {
    case "setup":
      return runSetupCommand(options, deps);
    case "preflight":
      return runPreflightCheck(loadDeployInputSync(options, deps));
    case "migrate":
      return runMigrateCommand(options, deps);
    case "build":
      return runBuildCommand(options, deps);
    case "start":
      return runStartCommand(options, deps);
    case "stop":
      return runStopCommand(options, deps);
    case "status":
      return runStatusCommand(options, deps);
    default:
      return 2;
  }
}

export async function runLocalProdCli(
  argv: string[],
  cwd = process.cwd(),
  deps: LocalProdDeps = defaultLocalProdDeps(),
): Promise<number> {
  try {
    const options = parseLocalProdArgs(argv, cwd);
    if (options.command === "preflight") {
      return runLocalDeployCli(
        [
          "preflight",
          "--dev-root",
          options.developmentRoot,
          "--prod-root",
          options.productionRoot,
          "--dev-env",
          options.developmentEnvPath,
          "--prod-env",
          options.productionEnvPath,
        ],
        cwd,
      );
    }
    return runLocalProdCommand(options, deps);
  } catch (error) {
    if (error instanceof HelpRequestedError) {
      console.log(HELP_TEXT.trim());
      return 0;
    }
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    return 2;
  }
}

const isMain =
  typeof process.argv[1] === "string" && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  process.exitCode = await runLocalProdCli(process.argv.slice(2));
}
