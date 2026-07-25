#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  LOCAL_PROD_LOG_FILE,
  LOCAL_PROD_RUNTIME_DIR,
  defaultLocalProdDeps,
  loadDeployInputSync,
  parseLocalProdArgs,
  runLocalProdCli,
  runPreflightCheck,
  type LocalProdOptions,
} from "./local-prod.mts";

export const LOCAL_PROD_SERVICE_LABEL = "com.edge.local-prod";
export const PLIST_TEMPLATE_PATH = join(process.cwd(), "ops/launchd/com.edge.local-prod.plist.template");

export type LocalProdServiceCommand =
  | "install"
  | "uninstall"
  | "start"
  | "stop"
  | "restart"
  | "status"
  | "logs"
  | "run";

export type LocalProdServiceOptions = LocalProdOptions & {
  command: LocalProdServiceCommand;
  tailLines: number;
};

export type LocalProdServiceExec = (
  file: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; encoding?: BufferEncoding },
) => string;

export type LocalProdServiceDeps = {
  execFile: LocalProdServiceExec;
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  mkdirSync: typeof mkdirSync;
  unlinkSync: typeof unlinkSync;
  uid: number;
  homeDir: string;
  cwd: string;
};

const DEFAULT_PATH =
  "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";

const HELP_TEXT = `Local production launchd service manager.

Commands:
  install    Render and bootstrap the LaunchAgent (preflight required)
  uninstall  Bootout and remove the installed plist
  start      Kickstart the LaunchAgent
  stop       Bootout the LaunchAgent
  restart    Kickstart -k the LaunchAgent
  status     Print launchd state and production runtime status
  logs       Tail production log files (no secrets)
  run        Foreground service supervisor (launchd entrypoint)

Options:
  --dev-root <path>     Development checkout (default: cwd)
  --prod-root <path>    Production worktree override
  --dev-env <path>      Development env file override
  --prod-env <path>     Production env file override
  --lines <n>           Log tail line count (default: 200)

Examples:
  npm run local:prod:service:install
  npm run local:prod:service:status
  npm run local:prod:service:logs
`;

export class ServiceHelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "ServiceHelpRequestedError";
  }
}

function defaultExecFile(
  file: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; encoding?: BufferEncoding },
): string {
  return execFileSync(file, args, {
    cwd: options?.cwd,
    env: options?.env ?? process.env,
    encoding: options?.encoding ?? "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function defaultLocalProdServiceDeps(cwd = process.cwd()): LocalProdServiceDeps {
  return {
    execFile: defaultExecFile,
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    unlinkSync,
    uid: process.getuid?.() ?? 501,
    homeDir: homedir(),
    cwd: resolve(cwd),
  };
}

export function launchAgentPlistPath(deps: Pick<LocalProdServiceDeps, "homeDir">): string {
  return join(deps.homeDir, "Library", "LaunchAgents", `${LOCAL_PROD_SERVICE_LABEL}.plist`);
}

export function launchAgentTarget(deps: Pick<LocalProdServiceDeps, "uid">): string {
  return `gui/${deps.uid}/${LOCAL_PROD_SERVICE_LABEL}`;
}

export function renderLaunchAgentPlist(input: {
  devRoot: string;
  homeDir: string;
  pathEnv?: string;
  template?: string;
}): string {
  const template =
    input.template ??
    readFileSync(join(input.devRoot, "ops/launchd/com.edge.local-prod.plist.template"), "utf8");
  return template
    .replaceAll("@DEV_ROOT@", input.devRoot)
    .replaceAll("@HOME@", input.homeDir)
    .replaceAll("@PATH@", input.pathEnv ?? DEFAULT_PATH);
}

export function parseLocalProdServiceArgs(argv: string[], cwd = process.cwd()): LocalProdServiceOptions {
  const args = [...argv];
  const knownCommands: LocalProdServiceCommand[] = [
    "install",
    "uninstall",
    "start",
    "stop",
    "restart",
    "status",
    "logs",
    "run",
  ];
  let command: LocalProdServiceCommand | null = null;
  if (args[0] && knownCommands.includes(args[0] as LocalProdServiceCommand)) {
    command = args.shift() as LocalProdServiceCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new ServiceHelpRequestedError();
    }
    throw new Error(
      "Missing command. Use: install | uninstall | start | stop | restart | status | logs | run",
    );
  }

  let tailLines = 200;
  const filtered: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new ServiceHelpRequestedError();
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
    filtered.push(flag);
  }

  const base = parseLocalProdArgs(["status", ...filtered], cwd);
  return {
    ...base,
    command,
    tailLines,
  };
}

export function isLaunchAgentInstalled(deps: LocalProdServiceDeps): boolean {
  return deps.existsSync(launchAgentPlistPath(deps));
}

export function isLaunchAgentLoaded(deps: LocalProdServiceDeps): boolean {
  try {
    deps.execFile("launchctl", ["print", launchAgentTarget(deps)]);
    return true;
  } catch {
    return false;
  }
}

export function readLaunchAgentState(deps: LocalProdServiceDeps): {
  installed: boolean;
  loaded: boolean;
  state: string | null;
} {
  const installed = isLaunchAgentInstalled(deps);
  if (!installed) {
    return { installed: false, loaded: false, state: null };
  }
  try {
    const output = deps.execFile("launchctl", ["print", launchAgentTarget(deps)]);
    const stateMatch = output.match(/^\s*state\s*=\s*(\S+)/m);
    return {
      installed: true,
      loaded: true,
      state: stateMatch?.[1] ?? "unknown",
    };
  } catch {
    return { installed: true, loaded: false, state: null };
  }
}

function ensureRuntimeDir(devRoot: string, deps: Pick<LocalProdServiceDeps, "mkdirSync">): void {
  deps.mkdirSync(join(devRoot, LOCAL_PROD_RUNTIME_DIR), { recursive: true });
}

export async function runInstallCommand(
  options: LocalProdServiceOptions,
  deps: LocalProdServiceDeps = defaultLocalProdServiceDeps(options.developmentRoot),
): Promise<number> {
  const preflight = runPreflightCheck(loadDeployInputSync(options, defaultLocalProdDeps()));
  if (preflight !== 0) {
    console.error("Service install aborted: preflight failed.");
    return preflight;
  }

  ensureRuntimeDir(options.developmentRoot, deps);
  const plistPath = launchAgentPlistPath(deps);
  deps.mkdirSync(join(deps.homeDir, "Library", "LaunchAgents"), { recursive: true });
  const rendered = renderLaunchAgentPlist({
    devRoot: options.developmentRoot,
    homeDir: deps.homeDir,
    pathEnv: process.env.PATH?.trim() || DEFAULT_PATH,
  });
  if (rendered.includes("EDGE_API_KEY") || rendered.includes("EDGE_AUTH_SECRET")) {
    console.error("Refusing to install plist: secret-like content detected in template output.");
    return 1;
  }
  deps.writeFileSync(plistPath, rendered, "utf8");

  if (isLaunchAgentLoaded(deps)) {
    try {
      deps.execFile("launchctl", ["bootout", launchAgentTarget(deps)]);
    } catch {
      // idempotent refresh
    }
  }

  deps.execFile("launchctl", ["bootstrap", `gui/${deps.uid}`, plistPath]);
  console.log(`local-prod.service=installed label=${LOCAL_PROD_SERVICE_LABEL} plist=${plistPath}`);
  return 0;
}

export function runUninstallCommand(
  _options: LocalProdServiceOptions,
  deps: LocalProdServiceDeps = defaultLocalProdServiceDeps(),
): number {
  const plistPath = launchAgentPlistPath(deps);
  if (isLaunchAgentLoaded(deps)) {
    try {
      deps.execFile("launchctl", ["bootout", launchAgentTarget(deps)]);
    } catch {
      // already unloaded
    }
  }
  if (deps.existsSync(plistPath)) {
    deps.unlinkSync(plistPath);
  }
  console.log(`local-prod.service=uninstalled label=${LOCAL_PROD_SERVICE_LABEL}`);
  return 0;
}

export function runServiceStartCommand(deps: LocalProdServiceDeps = defaultLocalProdServiceDeps()): number {
  if (!isLaunchAgentInstalled(deps)) {
    console.error("LaunchAgent is not installed. Run: npm run local:prod:service:install");
    return 1;
  }
  if (!isLaunchAgentLoaded(deps)) {
    const plistPath = launchAgentPlistPath(deps);
    deps.execFile("launchctl", ["bootstrap", `gui/${deps.uid}`, plistPath]);
  } else {
    deps.execFile("launchctl", ["kickstart", "-k", launchAgentTarget(deps)]);
  }
  console.log(`local-prod.service=start label=${LOCAL_PROD_SERVICE_LABEL}`);
  return 0;
}

export function runServiceStopCommand(deps: LocalProdServiceDeps = defaultLocalProdServiceDeps()): number {
  if (!isLaunchAgentLoaded(deps)) {
    console.log("local-prod.service=stop noop reason=not-loaded");
    return 0;
  }
  deps.execFile("launchctl", ["bootout", launchAgentTarget(deps)]);
  console.log(`local-prod.service=stop label=${LOCAL_PROD_SERVICE_LABEL}`);
  return 0;
}

export function runServiceRestartCommand(deps: LocalProdServiceDeps = defaultLocalProdServiceDeps()): number {
  if (!isLaunchAgentInstalled(deps)) {
    console.error("LaunchAgent is not installed. Run: npm run local:prod:service:install");
    return 1;
  }
  if (!isLaunchAgentLoaded(deps)) {
    return runServiceStartCommand(deps);
  }
  deps.execFile("launchctl", ["kickstart", "-k", launchAgentTarget(deps)]);
  console.log(`local-prod.service=restart label=${LOCAL_PROD_SERVICE_LABEL}`);
  return 0;
}

export async function runServiceStatusCommand(
  options: LocalProdServiceOptions,
  deps: LocalProdServiceDeps = defaultLocalProdServiceDeps(options.developmentRoot),
): Promise<number> {
  const agent = readLaunchAgentState(deps);
  console.log(
    `launchd: label=${LOCAL_PROD_SERVICE_LABEL} installed=${agent.installed ? "yes" : "no"} loaded=${agent.loaded ? "yes" : "no"} state=${agent.state ?? "none"}`,
  );
  return runLocalProdCli(
    [
      "status",
      "--dev-root",
      options.developmentRoot,
      "--prod-root",
      options.productionRoot,
      "--dev-env",
      options.developmentEnvPath,
      "--prod-env",
      options.productionEnvPath,
    ],
    options.developmentRoot,
  );
}

export function runLogsCommand(
  options: LocalProdServiceOptions,
  deps: LocalProdServiceDeps = defaultLocalProdServiceDeps(options.developmentRoot),
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
    console.log("local-prod.service=logs reason=no-log-files");
  }
  return 0;
}

export async function runServiceSupervisorCommand(
  options: LocalProdServiceOptions,
): Promise<number> {
  return runLocalProdCli(
    [
      "service-run",
      "--dev-root",
      options.developmentRoot,
      "--prod-root",
      options.productionRoot,
      "--dev-env",
      options.developmentEnvPath,
      "--prod-env",
      options.productionEnvPath,
    ],
    options.developmentRoot,
  );
}

export async function runLocalProdServiceCommand(
  options: LocalProdServiceOptions,
  deps: LocalProdServiceDeps = defaultLocalProdServiceDeps(options.developmentRoot),
): Promise<number> {
  switch (options.command) {
    case "install":
      return runInstallCommand(options, deps);
    case "uninstall":
      return runUninstallCommand(options, deps);
    case "start":
      return runServiceStartCommand(deps);
    case "stop":
      return runServiceStopCommand(deps);
    case "restart":
      return runServiceRestartCommand(deps);
    case "status":
      return runServiceStatusCommand(options, deps);
    case "logs":
      return runLogsCommand(options, deps);
    case "run":
      return runServiceSupervisorCommand(options);
    default:
      return 2;
  }
}

export async function runLocalProdServiceCli(
  argv: string[],
  cwd = process.cwd(),
  deps?: LocalProdServiceDeps,
): Promise<number> {
  try {
    const options = parseLocalProdServiceArgs(argv, cwd);
    return runLocalProdServiceCommand(options, deps ?? defaultLocalProdServiceDeps(options.developmentRoot));
  } catch (error) {
    if (error instanceof ServiceHelpRequestedError) {
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
  process.exitCode = await runLocalProdServiceCli(process.argv.slice(2));
}
