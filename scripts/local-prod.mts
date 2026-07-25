#!/usr/bin/env npx tsx

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
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
export const LOCAL_PROD_BLOCKED_FILE = "service-blocked.json";
export const LOCAL_PROD_SERVICE_LABEL = "com.edge.local-prod";
export const LOCAL_PROD_LOG_MAX_BYTES = 10 * 1024 * 1024;
export const LOCAL_PROD_BLOCKED_SLEEP_MS = 300_000;

export type LocalProdSupervisor = "manual" | "launchd";

export type LocalProdCommand =
  | "setup"
  | "preflight"
  | "migrate"
  | "build"
  | "start"
  | "stop"
  | "status"
  | "service-run"
  | "logs";

export type LocalProdRuntimeMeta = {
  pid: number;
  startedAt: string;
  revision: string;
  buildId: string | null;
  host: string;
  port: number;
  logPath: string;
  supervisor: LocalProdSupervisor;
};

export type LocalProdBlockedState = {
  at: string;
  reason: string;
  detail?: string;
};

export type LocalProdOptions = {
  command: LocalProdCommand;
  developmentRoot: string;
  productionRoot: string;
  developmentEnvPath: string;
  productionEnvPath: string;
  revision: string | null;
  skipInfra: boolean;
  tailLines: number;
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
  appendFileSync: typeof appendFileSync;
  mkdirSync: typeof mkdirSync;
  unlinkSync: typeof unlinkSync;
  statSync: typeof statSync;
  renameSync: typeof renameSync;
  probeReadyz: typeof probeReadyz;
  spawnProcess: typeof spawn;
  killProcess: (pid: number, signal?: NodeJS.Signals) => boolean;
  processAlive: (pid: number) => boolean;
  listenPidsOnPort: (port: number) => number[];
  fetchImpl: typeof fetch;
  uid: number;
  sleep: (ms: number) => Promise<void>;
};

const HELP_TEXT = `Local production runtime wrapper.

Commands:
  setup      Create detached production worktree (--revision required)
  preflight  Validate paired dev/prod profiles
  migrate    Apply migrations to edge_prod
  build      Install deps and next build in production worktree
  start        Start next start on 127.0.0.1:3000 (background, manual supervisor)
  stop         Stop the managed production process
  status       Print runtime identity and readiness
  service-run  Foreground supervisor entrypoint for launchd
  logs         Tail managed production logs (redacted)

Options:
  --dev-root <path>     Development checkout (default: cwd)
  --prod-root <path>    Production worktree (default: sibling *-production)
  --dev-env <path>      Development env file override
  --prod-env <path>     Production env file override
  --revision <sha>      Git commit/tag for setup (required for setup)
  --skip-infra          Skip docker compose up before migrate/start
  --lines <n>           Log tail line count for logs (default: 200)

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
    appendFileSync,
    mkdirSync,
    unlinkSync,
    statSync,
    renameSync,
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
    uid: process.getuid?.() ?? 501,
    sleep: (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms)),
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
    "service-run",
    "logs",
  ];
  if (args[0] && knownCommands.includes(args[0] as LocalProdCommand)) {
    command = args.shift() as LocalProdCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new HelpRequestedError();
    }
    throw new Error(
      "Missing command. Use: setup | preflight | migrate | build | start | stop | status | service-run | logs",
    );
  }

  let developmentRoot = resolve(cwd);
  let productionRoot = defaultProductionRoot(developmentRoot);
  let developmentEnvPath: string | null = null;
  let productionEnvPath: string | null = null;
  let revision: string | null = null;
  let skipInfra = false;
  let tailLines = 200;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new HelpRequestedError();
    }
    if (flag === "--skip-infra") {
      skipInfra = true;
      continue;
    }
    if (flag === "--lines") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--lines requires a value");
      }
      tailLines = Number.parseInt(value, 10);
      if (!Number.isFinite(tailLines) || tailLines < 1) {
        throw new Error("--lines must be a positive integer");
      }
      index += 1;
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
    tailLines,
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
    blockedPath: join(dir, LOCAL_PROD_BLOCKED_FILE),
  };
}

export function launchAgentTarget(uid: number): string {
  return `gui/${uid}/${LOCAL_PROD_SERVICE_LABEL}`;
}

export function isLaunchAgentLoaded(deps: Pick<LocalProdDeps, "execFile" | "uid">): boolean {
  try {
    deps.execFile("launchctl", ["print", launchAgentTarget(deps.uid)]);
    return true;
  } catch {
    return false;
  }
}

export function rotateLogIfNeeded(
  logPath: string,
  deps: Pick<LocalProdDeps, "existsSync" | "statSync" | "renameSync">,
  maxBytes = LOCAL_PROD_LOG_MAX_BYTES,
): void {
  if (!deps.existsSync(logPath)) return;
  try {
    const size = deps.statSync(logPath).size;
    if (size <= maxBytes) return;
    const rotated = `${logPath}.1`;
    if (deps.existsSync(rotated)) {
      // keep one retained rotation
      return;
    }
    deps.renameSync(logPath, rotated);
  } catch {
    // best effort
  }
}

export function readBlockedState(
  developmentRoot: string,
  deps: Pick<LocalProdDeps, "existsSync" | "readFileSync">,
): LocalProdBlockedState | null {
  const { blockedPath } = runtimePaths(developmentRoot);
  if (!deps.existsSync(blockedPath)) return null;
  try {
    return JSON.parse(deps.readFileSync(blockedPath, "utf8")) as LocalProdBlockedState;
  } catch {
    return null;
  }
}

function writeBlockedState(
  developmentRoot: string,
  state: LocalProdBlockedState,
  deps: Pick<LocalProdDeps, "mkdirSync" | "writeFileSync">,
): void {
  const { dir, blockedPath } = runtimePaths(developmentRoot);
  deps.mkdirSync(dir, { recursive: true });
  deps.writeFileSync(blockedPath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function clearBlockedState(
  developmentRoot: string,
  deps: Pick<LocalProdDeps, "existsSync" | "unlinkSync">,
): void {
  const { blockedPath } = runtimePaths(developmentRoot);
  if (deps.existsSync(blockedPath)) deps.unlinkSync(blockedPath);
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
    return {
      ...parsed,
      supervisor: parsed.supervisor ?? "manual",
    };
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
  const { pidPath, metaPath, blockedPath } = runtimePaths(developmentRoot);
  if (deps.existsSync(pidPath)) deps.unlinkSync(pidPath);
  if (deps.existsSync(metaPath)) deps.unlinkSync(metaPath);
  if (deps.existsSync(blockedPath)) deps.unlinkSync(blockedPath);
}

async function spawnProductionProcess(
  options: LocalProdOptions,
  deps: LocalProdDeps,
  supervisor: LocalProdSupervisor,
  foreground: boolean,
): Promise<{ code: number; child: ChildProcess | null }> {
  const port = LOCAL_DEPLOY_CONTRACT.production.port;
  const host = LOCAL_DEPLOY_CONTRACT.production.host;
  const { dir, pidPath, logPath } = runtimePaths(options.developmentRoot);
  deps.mkdirSync(dir, { recursive: true });
  rotateLogIfNeeded(logPath, deps);

  loadProfileEnvIntoProcess(options.productionRoot, "production");
  const revision = readWorktreeRevision(options.productionRoot, deps.execFile);
  const buildId = readBuildId(options.productionRoot, deps);

  const child = deps.spawnProcess(
    "npm",
    ["run", "start", "--", "-H", host, "-p", String(port)],
    {
      cwd: options.productionRoot,
      env: { ...process.env, NODE_ENV: "production" },
      detached: !foreground,
      stdio: foreground ? ["ignore", "pipe", "pipe"] : ["ignore", "open", logPath],
    },
  );

  if (!child?.pid) {
    console.error("Failed to start production process.");
    return { code: 1, child: null };
  }

  if (foreground && child.stdout && child.stderr) {
    child.stdout.on("data", (chunk: Buffer | string) => {
      deps.appendFileSync(logPath, String(chunk));
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      deps.appendFileSync(logPath, String(chunk));
    });
  }

  const meta: LocalProdRuntimeMeta = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    revision: revision ?? "unknown",
    buildId,
    host,
    port,
    logPath,
    supervisor,
  };
  writeRuntimeMeta(options.developmentRoot, meta, deps);
  deps.writeFileSync(pidPath, String(child.pid) + "\n", "utf8");

  if (!foreground) {
    child.unref();
    await deps.sleep(1500);
    const readyzUrl = process.env.EDGE_READYZ_URL?.trim() || `http://${host}:${port}/readyz`;
    const ready = await deps.probeReadyz(readyzUrl, deps.fetchImpl);
    console.log(
      `production.start=pass pid=${child.pid} revision=${meta.revision} buildId=${buildId ?? "missing"} supervisor=${supervisor} readyz=${ready.ok ? "pass" : "pending"}`,
    );
    if (!ready.ok) {
      console.error(`Readiness pending: ${ready.reasons.join(", ") || "unknown"}`);
    }
    return { code: 0, child };
  }

  return new Promise((resolvePromise) => {
    let shuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) return;
      shuttingDown = true;
      deps.killProcess(child.pid!, signal);
    };
    process.once("SIGTERM", () => shutdown("TERM"));
    process.once("SIGINT", () => shutdown("TERM"));

    child.on("exit", (exitCode, exitSignal) => {
      clearRuntimeState(options.developmentRoot, deps);
      const code = exitCode ?? (exitSignal ? 1 : 0);
      console.error(
        `production.service-run=exit code=${code} signal=${exitSignal ?? "none"} revision=${meta.revision}`,
      );
      resolvePromise({ code, child });
    });
  });
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

  if (isLaunchAgentLoaded(deps)) {
    console.error(
      "LaunchAgent owns production lifecycle. Use: npm run local:prod:service:start (or stop the service first).",
    );
    return 1;
  }

  const buildIdPath = join(options.productionRoot, ".next", "BUILD_ID");
  if (!deps.existsSync(buildIdPath)) {
    console.error("Production build is missing. Run: npm run local:prod:build");
    return 1;
  }

  const port = LOCAL_DEPLOY_CONTRACT.production.port;
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

  const result = await spawnProductionProcess(options, deps, "manual", false);
  return result.code;
}

export async function runStopCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  const meta = readRuntimeMeta(options.developmentRoot, deps);
  if (meta?.supervisor === "launchd" && isLaunchAgentLoaded(deps)) {
    console.error(
      "Production is launchd-managed. Use: npm run local:prod:service:stop",
    );
    return 1;
  }

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
  await deps.sleep(1000);
  if (deps.processAlive(meta.pid)) {
    deps.killProcess(meta.pid, "KILL");
  }

  clearRuntimeState(options.developmentRoot, deps);
  console.log(`production.stop=pass pid=${meta.pid}`);
  return 0;
}

export async function runServiceRunCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): Promise<number> {
  while (true) {
    clearBlockedState(options.developmentRoot, deps);

    const input = loadDeployInputSync(options, deps);
    const preflight = runPreflightCheck(input);
    if (preflight !== 0) {
      writeBlockedState(
        options.developmentRoot,
        { at: new Date().toISOString(), reason: "preflight_failed" },
        deps,
      );
      console.error("production.service-run=blocked reason=preflight_failed");
      await deps.sleep(LOCAL_PROD_BLOCKED_SLEEP_MS);
      continue;
    }

    const buildIdPath = join(options.productionRoot, ".next", "BUILD_ID");
    if (!deps.existsSync(buildIdPath)) {
      writeBlockedState(
        options.developmentRoot,
        { at: new Date().toISOString(), reason: "missing_build" },
        deps,
      );
      console.error("production.service-run=blocked reason=missing_build");
      await deps.sleep(LOCAL_PROD_BLOCKED_SLEEP_MS);
      continue;
    }

    const port = LOCAL_DEPLOY_CONTRACT.production.port;
    const listeners = deps.listenPidsOnPort(port).filter((pid) => {
      const meta = readRuntimeMeta(options.developmentRoot, deps);
      return !meta || pid !== meta.pid;
    });
    if (listeners.length > 0) {
      writeBlockedState(
        options.developmentRoot,
        {
          at: new Date().toISOString(),
          reason: "port_collision",
          detail: listeners.join(","),
        },
        deps,
      );
      console.error(`production.service-run=blocked reason=port_collision pids=${listeners.join(",")}`);
      await deps.sleep(LOCAL_PROD_BLOCKED_SLEEP_MS);
      continue;
    }

    const infra = ensureSharedInfra(options.skipInfra);
    if (infra !== 0) {
      console.error("production.service-run=retry reason=infra_unavailable");
      await deps.sleep(30_000);
      continue;
    }

    const migrateCode = await runMigrateCommand({ ...options, skipInfra: true }, deps);
    if (migrateCode !== 0) {
      writeBlockedState(
        options.developmentRoot,
        { at: new Date().toISOString(), reason: "migrate_failed" },
        deps,
      );
      console.error("production.service-run=blocked reason=migrate_failed");
      await deps.sleep(LOCAL_PROD_BLOCKED_SLEEP_MS);
      continue;
    }

    const result = await spawnProductionProcess(options, deps, "launchd", true);
    if (result.code !== 0) {
      await deps.sleep(30_000);
      continue;
    }
  }
}

export function runLogsCommand(
  options: LocalProdOptions,
  deps: LocalProdDeps,
): number {
  const runtimeDir = join(options.developmentRoot, LOCAL_PROD_RUNTIME_DIR);
  const candidates = [
    join(runtimeDir, LOCAL_PROD_LOG_FILE),
    join(runtimeDir, "launchd-stdout.log"),
    join(runtimeDir, "launchd-stderr.log"),
  ];
  let printed = false;
  for (const logPath of candidates) {
    if (!deps.existsSync(logPath)) continue;
    const content = deps.readFileSync(logPath, "utf8");
    const lines = content.split("\n").filter((line) => line.length > 0);
    const tail = lines.slice(-options.tailLines);
    console.log(`--- ${logPath} (last ${tail.length} lines) ---`);
    for (const line of tail) {
      if (/EDGE_API_KEY|EDGE_AUTH_SECRET|postgres:\/\/[^@]+@/i.test(line)) {
        console.log("[redacted line omitted]");
        continue;
      }
      console.log(line);
    }
    printed = true;
  }
  if (!printed) {
    console.log("production.logs=empty");
  }
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
  const launchdLoaded = isLaunchAgentLoaded(deps);
  const blocked = readBlockedState(options.developmentRoot, deps);

  let managed = "stopped";
  let pid: number | null = null;
  let supervisor: LocalProdSupervisor | "none" = "none";
  if (meta && deps.processAlive(meta.pid)) {
    managed = "running";
    pid = meta.pid;
    supervisor = meta.supervisor;
  } else if (meta) {
    managed = "stale";
    supervisor = meta.supervisor;
  }

  const host = LOCAL_DEPLOY_CONTRACT.production.host;
  const readyzUrl = input.production.EDGE_READYZ_URL?.trim() || `http://${host}:${port}/readyz`;
  const ready =
    managed === "running" ? await deps.probeReadyz(readyzUrl, deps.fetchImpl) : null;

  console.log(
    `development: revision=${devRevision ?? "unknown"} mode=dev port=${LOCAL_DEPLOY_CONTRACT.development.port}`,
  );
  console.log(
    `production: revision=${prodRevision ?? "unknown"} buildId=${prodBuildId ?? "missing"} mode=start port=${port} managed=${managed} supervisor=${supervisor} launchd=${launchdLoaded ? "loaded" : "none"} pid=${pid ?? "none"} listeners=${listeners.join(",") || "none"}`,
  );
  if (blocked) {
    console.log(
      `production.blocked=${blocked.reason} at=${blocked.at} detail=${blocked.detail ?? "none"}`,
    );
  }
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
    case "service-run":
      return runServiceRunCommand(options, deps);
    case "logs":
      return runLogsCommand(options, deps);
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
