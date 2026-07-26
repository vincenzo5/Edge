#!/usr/bin/env npx tsx

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const LOCAL_HTTPS_HOST = "edge.local";
export const LOCAL_HTTPS_UPSTREAM = "127.0.0.1:3000";
export const LOCAL_HTTPS_BIND = "127.0.0.1";
export const LOCAL_HTTPS_PORT = 443;
export const LOCAL_HTTPS_STATE_DIR = ".edge/local-https";
export const LOCAL_HTTPS_SERVICE_LABEL = "com.edge.local-https";
export const LOCAL_HTTPS_CADDYFILE_RELATIVE = "ops/caddy/Caddyfile";
export const LOCAL_HTTPS_PLIST_TEMPLATE_RELATIVE = "ops/launchd/com.edge.local-https.plist.template";
export const LOCAL_HTTPS_CERT_FILE = "edge.local.pem";
export const LOCAL_HTTPS_KEY_FILE = "edge.local-key.pem";

export type LocalHttpsCommand =
  | "install-certs"
  | "start"
  | "stop"
  | "status"
  | "uninstall"
  | "service-install"
  | "service-uninstall"
  | "service-status"
  | "run";

export type LocalHttpsOptions = {
  command: LocalHttpsCommand;
  developmentRoot: string;
  purgeCerts: boolean;
};

export type LocalHttpsExec = (
  file: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; encoding?: BufferEncoding },
) => string;

export type LocalHttpsDeps = {
  execFile: LocalHttpsExec;
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
  mkdirSync: typeof mkdirSync;
  unlinkSync: typeof unlinkSync;
  uid: number;
  homeDir: string;
  fetchImpl: typeof fetch;
  listenPidsOnPort: (port: number) => number[];
};

const DEFAULT_PATH =
  "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";

const HELP_TEXT = `Local HTTPS front door for production (https://edge.local).

Commands:
  install-certs       Generate mkcert TLS material into .edge/local-https/
  start               Start Caddy on loopback :443 (background)
  stop                Stop the Caddy front door
  status              Print secret-free proxy/upstream/TLS status
  uninstall           Stop proxy, uninstall LaunchAgent, optional cert purge
  service-install     Install LaunchAgent for login/reboot persistence
  service-uninstall   Remove LaunchAgent
  service-status      Print LaunchAgent state
  run                 Foreground Caddy (LaunchAgent entrypoint)

Options:
  --dev-root <path>   Development checkout (default: cwd)
  --purge-certs       Remove TLS files during uninstall

Examples:
  npm run local:https:install
  npm run local:https:start
  npm run local:https:status
  npm run local:https:service:install
`;

export class LocalHttpsHelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "LocalHttpsHelpRequestedError";
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

function defaultListenPidsOnPort(port: number): number[] {
  try {
    const output = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const pids = new Set<number>();
    for (const line of output.split("\n").slice(1)) {
      const match = line.match(/^\S+\s+(\d+)\s+/);
      if (match) pids.add(Number.parseInt(match[1]!, 10));
    }
    return [...pids];
  } catch {
    return [];
  }
}

export function defaultLocalHttpsDeps(cwd = process.cwd()): LocalHttpsDeps {
  return {
    execFile: defaultExecFile,
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    unlinkSync,
    uid: process.getuid?.() ?? 501,
    homeDir: homedir(),
    fetchImpl: fetch,
    listenPidsOnPort: defaultListenPidsOnPort,
  };
}

export function parseLocalHttpsArgs(argv: string[], cwd = process.cwd()): LocalHttpsOptions {
  const args = [...argv];
  const knownCommands: LocalHttpsCommand[] = [
    "install-certs",
    "start",
    "stop",
    "status",
    "uninstall",
    "service-install",
    "service-uninstall",
    "service-status",
    "run",
  ];
  let command: LocalHttpsCommand | null = null;
  if (args[0] && knownCommands.includes(args[0] as LocalHttpsCommand)) {
    command = args.shift() as LocalHttpsCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new LocalHttpsHelpRequestedError();
    }
    throw new Error(
      "Missing command. Use: install-certs | start | stop | status | uninstall | service-install | service-uninstall | service-status | run",
    );
  }

  let developmentRoot = resolve(cwd);
  let purgeCerts = false;
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new LocalHttpsHelpRequestedError();
    }
    if (flag === "--dev-root") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--dev-root requires a value");
      }
      developmentRoot = resolve(value);
      index += 1;
      continue;
    }
    if (flag === "--purge-certs") {
      purgeCerts = true;
      continue;
    }
    throw new Error(`Unknown argument: ${flag}`);
  }

  return { command, developmentRoot, purgeCerts };
}

export function localHttpsPaths(developmentRoot: string) {
  const stateDir = join(developmentRoot, LOCAL_HTTPS_STATE_DIR);
  return {
    stateDir,
    caddyfilePath: join(developmentRoot, LOCAL_HTTPS_CADDYFILE_RELATIVE),
    certPath: join(stateDir, LOCAL_HTTPS_CERT_FILE),
    keyPath: join(stateDir, LOCAL_HTTPS_KEY_FILE),
    plistTemplatePath: join(developmentRoot, LOCAL_HTTPS_PLIST_TEMPLATE_RELATIVE),
  };
}

export function assertLoopbackCaddyfile(content: string): void {
  if (/\b0\.0\.0\.0\b/.test(content) || /\b::\b/.test(content) || /\b\[::\]\b/.test(content)) {
    throw new Error("Caddyfile must not bind non-loopback addresses");
  }
  if (!/\bbind\s+127\.0\.0\.1\b/.test(content)) {
    throw new Error("Caddyfile must bind 127.0.0.1 only");
  }
}

export function readCaddyfileContent(developmentRoot: string, deps: Pick<LocalHttpsDeps, "readFileSync">): string {
  const { caddyfilePath } = localHttpsPaths(developmentRoot);
  return deps.readFileSync(caddyfilePath, "utf8");
}

export function hasHostsEntryForEdgeLocal(deps: Pick<LocalHttpsDeps, "readFileSync">): boolean {
  try {
    const hosts = deps.readFileSync("/etc/hosts", "utf8");
    return hosts
      .split("\n")
      .some((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return false;
        const parts = trimmed.split(/\s+/);
        return parts.some((part) => part.toLowerCase() === LOCAL_HTTPS_HOST);
      });
  } catch {
    return false;
  }
}

export function launchAgentPlistPath(deps: Pick<LocalHttpsDeps, "homeDir">): string {
  return join(deps.homeDir, "Library", "LaunchAgents", `${LOCAL_HTTPS_SERVICE_LABEL}.plist`);
}

export function launchAgentTarget(deps: Pick<LocalHttpsDeps, "uid">): string {
  return `gui/${deps.uid}/${LOCAL_HTTPS_SERVICE_LABEL}`;
}

export function renderLaunchAgentPlist(input: {
  devRoot: string;
  homeDir: string;
  pathEnv?: string;
  template?: string;
}): string {
  const template =
    input.template ??
    readFileSync(join(input.devRoot, LOCAL_HTTPS_PLIST_TEMPLATE_RELATIVE), "utf8");
  return template
    .replaceAll("@DEV_ROOT@", input.devRoot)
    .replaceAll("@HOME@", input.homeDir)
    .replaceAll("@PATH@", input.pathEnv ?? DEFAULT_PATH);
}

export function readLaunchAgentState(deps: LocalHttpsDeps): {
  installed: boolean;
  loaded: boolean;
  state: string | null;
} {
  const installed = deps.existsSync(launchAgentPlistPath(deps));
  try {
    const output = deps.execFile("launchctl", ["print", launchAgentTarget(deps)]);
    const stateMatch = output.match(/^\s*state\s*=\s*(\S+)/m);
    return { installed, loaded: true, state: stateMatch?.[1] ?? null };
  } catch {
    return { installed, loaded: false, state: null };
  }
}

export type LocalHttpsStatusFacts = {
  hostsEntry: boolean;
  tlsPresent: boolean;
  caddyfileLoopback: boolean;
  launchAgentInstalled: boolean;
  launchAgentLoaded: boolean;
  launchAgentState: string | null;
  proxyListening: boolean;
  proxyUp: boolean;
  upstreamReady: boolean;
  healthzOk: boolean;
  readyzOk: boolean;
};

export async function collectLocalHttpsStatusFacts(
  developmentRoot: string,
  deps: LocalHttpsDeps,
): Promise<LocalHttpsStatusFacts> {
  const paths = localHttpsPaths(developmentRoot);
  let caddyfileLoopback = false;
  try {
    assertLoopbackCaddyfile(readCaddyfileContent(developmentRoot, deps));
    caddyfileLoopback = true;
  } catch {
    caddyfileLoopback = false;
  }

  const agent = readLaunchAgentState(deps);
  const proxyListening = deps.listenPidsOnPort(LOCAL_HTTPS_PORT).length > 0;

  let healthzOk = false;
  let readyzOk = false;
  let upstreamReady = false;
  try {
    const upstream = await deps.fetchImpl(`http://${LOCAL_HTTPS_UPSTREAM}/readyz`);
    upstreamReady = upstream.ok;
  } catch {
    upstreamReady = false;
  }
  try {
    const healthz = await deps.fetchImpl(`https://${LOCAL_HTTPS_HOST}/healthz`);
    healthzOk = healthz.ok;
  } catch {
    healthzOk = false;
  }
  try {
    const readyz = await deps.fetchImpl(`https://${LOCAL_HTTPS_HOST}/readyz`);
    readyzOk = readyz.ok;
  } catch {
    readyzOk = false;
  }

  return {
    hostsEntry: hasHostsEntryForEdgeLocal(deps),
    tlsPresent: deps.existsSync(paths.certPath) && deps.existsSync(paths.keyPath),
    caddyfileLoopback,
    launchAgentInstalled: agent.installed,
    launchAgentLoaded: agent.loaded,
    launchAgentState: agent.state,
    proxyListening,
    proxyUp: proxyListening && healthzOk,
    upstreamReady,
    healthzOk,
    readyzOk,
  };
}

export function formatLocalHttpsStatusSummary(facts: LocalHttpsStatusFacts): string {
  return [
    `proxy.host=${LOCAL_HTTPS_HOST}`,
    `proxy.bind=${LOCAL_HTTPS_BIND}:${LOCAL_HTTPS_PORT}`,
    `upstream=${LOCAL_HTTPS_UPSTREAM}`,
    `hosts.entry=${facts.hostsEntry ? "yes" : "no"}`,
    `tls.present=${facts.tlsPresent ? "yes" : "no"}`,
    `caddyfile.loopback=${facts.caddyfileLoopback ? "yes" : "no"}`,
    `proxy.listening=${facts.proxyListening ? "yes" : "no"}`,
    `proxy.up=${facts.proxyUp ? "yes" : "no"}`,
    `upstream.readyz=${facts.upstreamReady ? "pass" : "fail"}`,
    `https.healthz=${facts.healthzOk ? "pass" : "fail"}`,
    `https.readyz=${facts.readyzOk ? "pass" : "fail"}`,
    `launchd.installed=${facts.launchAgentInstalled ? "yes" : "no"}`,
    `launchd.loaded=${facts.launchAgentLoaded ? "yes" : "no"}`,
    `launchd.state=${facts.launchAgentState ?? "none"}`,
  ].join("\n");
}

function ensureStateDir(developmentRoot: string, deps: LocalHttpsDeps): string {
  const { stateDir } = localHttpsPaths(developmentRoot);
  deps.mkdirSync(stateDir, { recursive: true });
  return stateDir;
}

function resolveCaddyBinary(deps: LocalHttpsDeps): string {
  for (const candidate of ["/opt/homebrew/bin/caddy", "/usr/local/bin/caddy", "caddy"]) {
    try {
      deps.execFile(candidate, ["version"]);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error("caddy not found. Install with: brew install caddy");
}

function resolveMkcertBinary(deps: LocalHttpsDeps): string {
  for (const candidate of ["/opt/homebrew/bin/mkcert", "/usr/local/bin/mkcert", "mkcert"]) {
    try {
      deps.execFile(candidate, ["-help"]);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error("mkcert not found. Install with: brew install mkcert && mkcert -install");
}

function validateCaddyConfig(
  developmentRoot: string,
  deps: LocalHttpsDeps,
  caddyBinary: string,
): void {
  const paths = localHttpsPaths(developmentRoot);
  assertLoopbackCaddyfile(readCaddyfileContent(developmentRoot, deps));
  deps.execFile(
    caddyBinary,
    ["validate", "--config", paths.caddyfilePath, "--adapter", "caddyfile"],
    { cwd: join(paths.caddyfilePath, "..") },
  );
}

export function runInstallCertsCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): number {
  ensureStateDir(developmentRoot, deps);
  const mkcert = resolveMkcertBinary(deps);
  const paths = localHttpsPaths(developmentRoot);
  deps.execFile(
    mkcert,
    [
      "-cert-file",
      paths.certPath,
      "-key-file",
      paths.keyPath,
      LOCAL_HTTPS_HOST,
    ],
    { cwd: developmentRoot },
  );
  console.log(`local-https.certs=installed host=${LOCAL_HTTPS_HOST}`);
  if (!hasHostsEntryForEdgeLocal(deps)) {
    console.log(
      `local-https.hosts=missing next='sudo sh -c \"echo 127.0.0.1 edge.local >> /etc/hosts\"'`,
    );
  }
  return 0;
}

export function runStartCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): number {
  const paths = localHttpsPaths(developmentRoot);
  if (!deps.existsSync(paths.certPath) || !deps.existsSync(paths.keyPath)) {
    console.error("TLS material missing. Run: npm run local:https:install");
    return 1;
  }
  const caddy = resolveCaddyBinary(deps);
  validateCaddyConfig(developmentRoot, deps, caddy);
  if (deps.listenPidsOnPort(LOCAL_HTTPS_PORT).length > 0) {
    console.log("local-https.proxy=already-running");
    return 0;
  }
  try {
    deps.execFile(
      caddy,
      ["start", "--config", paths.caddyfilePath, "--adapter", "caddyfile"],
      { cwd: join(paths.caddyfilePath, "..") },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/permission denied|bind:.*443/i.test(message)) {
      console.error(
        "Port 443 requires elevated privileges on macOS. From the repo root, run:",
      );
      console.error("  cd ops/caddy && sudo caddy start --config Caddyfile --adapter caddyfile");
      console.error("See docs/ops/local-https.md for hosts, mkcert, and LaunchAgent setup.");
      return 1;
    }
    throw error;
  }
  console.log(`local-https.proxy=started url=https://${LOCAL_HTTPS_HOST}`);
  if (!hasHostsEntryForEdgeLocal(deps)) {
    console.log("local-https.hosts=missing see docs/ops/local-https.md");
  }
  return 0;
}

export function runStopCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): number {
  const caddy = resolveCaddyBinary(deps);
  const paths = localHttpsPaths(developmentRoot);
  try {
    deps.execFile(caddy, ["stop", "--config", paths.caddyfilePath, "--adapter", "caddyfile"], {
      cwd: join(paths.caddyfilePath, ".."),
    });
    console.log("local-https.proxy=stopped");
    return 0;
  } catch (error) {
    if (deps.listenPidsOnPort(LOCAL_HTTPS_PORT).length === 0) {
      console.log("local-https.proxy=not-running");
      return 0;
    }
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function runStatusCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): Promise<number> {
  const facts = await collectLocalHttpsStatusFacts(developmentRoot, deps);
  console.log(formatLocalHttpsStatusSummary(facts));
  return facts.proxyUp && facts.upstreamReady ? 0 : 1;
}

export function runUninstallCommand(
  options: LocalHttpsOptions,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(options.developmentRoot),
): number {
  runStopCommand(options.developmentRoot, deps);
  runServiceUninstallCommand(options.developmentRoot, deps);
  if (options.purgeCerts) {
    const paths = localHttpsPaths(options.developmentRoot);
    for (const filePath of [paths.certPath, paths.keyPath]) {
      if (deps.existsSync(filePath)) {
        deps.unlinkSync(filePath);
      }
    }
    console.log("local-https.certs=purged");
  }
  console.log("local-https.uninstall=complete");
  return 0;
}

export function runServiceInstallCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): number {
  ensureStateDir(developmentRoot, deps);
  const paths = localHttpsPaths(developmentRoot);
  if (!deps.existsSync(paths.certPath) || !deps.existsSync(paths.keyPath)) {
    console.error("TLS material missing. Run: npm run local:https:install");
    return 1;
  }
  validateCaddyConfig(developmentRoot, deps, resolveCaddyBinary(deps));
  const plistPath = launchAgentPlistPath(deps);
  const rendered = renderLaunchAgentPlist({
    devRoot: developmentRoot,
    homeDir: deps.homeDir,
    template: deps.readFileSync(paths.plistTemplatePath, "utf8"),
  });
  deps.writeFileSync(plistPath, rendered, "utf8");
  deps.execFile("launchctl", ["bootstrap", launchAgentTarget(deps), plistPath]);
  console.log(`local-https.service=installed label=${LOCAL_HTTPS_SERVICE_LABEL}`);
  return 0;
}

export function runServiceUninstallCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): number {
  const plistPath = launchAgentPlistPath(deps);
  if (deps.existsSync(plistPath)) {
    try {
      deps.execFile("launchctl", ["bootout", launchAgentTarget(deps)]);
    } catch {
      // bootout may fail if already unloaded
    }
    deps.unlinkSync(plistPath);
    console.log(`local-https.service=uninstalled label=${LOCAL_HTTPS_SERVICE_LABEL}`);
  } else {
    console.log("local-https.service=not-installed");
  }
  return 0;
}

export function runServiceStatusCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): number {
  const agent = readLaunchAgentState(deps);
  console.log(
    `launchd: label=${LOCAL_HTTPS_SERVICE_LABEL} installed=${agent.installed ? "yes" : "no"} loaded=${agent.loaded ? "yes" : "no"} state=${agent.state ?? "none"}`,
  );
  return 0;
}

export function runForegroundCommand(
  developmentRoot: string,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(developmentRoot),
): number {
  const paths = localHttpsPaths(developmentRoot);
  if (!deps.existsSync(paths.certPath) || !deps.existsSync(paths.keyPath)) {
    console.error("TLS material missing. Run: npm run local:https:install");
    return 1;
  }
  const caddy = resolveCaddyBinary(deps);
  validateCaddyConfig(developmentRoot, deps, caddy);
  const result = spawnSync(
    caddy,
    ["run", "--config", paths.caddyfilePath, "--adapter", "caddyfile"],
    { cwd: join(paths.caddyfilePath, ".."), stdio: "inherit", env: process.env },
  );
  return result.status ?? 1;
}

export async function runLocalHttpsCommand(
  options: LocalHttpsOptions,
  deps: LocalHttpsDeps = defaultLocalHttpsDeps(options.developmentRoot),
): Promise<number> {
  switch (options.command) {
    case "install-certs":
      return runInstallCertsCommand(options.developmentRoot, deps);
    case "start":
      return runStartCommand(options.developmentRoot, deps);
    case "stop":
      return runStopCommand(options.developmentRoot, deps);
    case "status":
      return runStatusCommand(options.developmentRoot, deps);
    case "uninstall":
      return runUninstallCommand(options, deps);
    case "service-install":
      return runServiceInstallCommand(options.developmentRoot, deps);
    case "service-uninstall":
      return runServiceUninstallCommand(options.developmentRoot, deps);
    case "service-status":
      return runServiceStatusCommand(options.developmentRoot, deps);
    case "run":
      return runForegroundCommand(options.developmentRoot, deps);
    default:
      throw new Error(`Unsupported command: ${options.command satisfies never}`);
  }
}

export async function runLocalHttpsCli(argv: string[], cwd = process.cwd()): Promise<number> {
  try {
    const options = parseLocalHttpsArgs(argv, cwd);
    return runLocalHttpsCommand(options);
  } catch (error) {
    if (error instanceof LocalHttpsHelpRequestedError) {
      console.log(HELP_TEXT);
      return 0;
    }
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runLocalHttpsCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
