#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { probeHealthz, runDeployHealthGate } from "./deploy-health-gate.mts";
import {
  formatVerifyResult,
  verifyLocalDataIsolation,
  verifyPostgresIsolation,
} from "./local-data-infrastructure.mts";
import {
  LOCAL_PROD_RUNTIME_DIR,
  defaultLocalProdDeps,
  isLaunchAgentLoaded,
  loadDeployInputSync,
  readBuildId,
  readDeployRevisionState,
  readRuntimeMeta,
  readWorktreeRevision,
  type LocalProdDeps,
  type LocalProdOptions,
} from "./local-prod.mts";
import { probeReadyz } from "../src/lib/observability/readyzProbe.ts";
import {
  LOCAL_DEPLOY_CONTRACT,
  formatLocalDeployIssues,
  validateLocalDeploy,
  type LocalDeployInput,
} from "./validate-local-deploy.mts";

export const VERIFY_STATE_FILE = "verify-state.json";
export const VERIFY_SCENARIO_RESULTS_FILE = "verify-scenario-results.json";

export const VERIFY_SCENARIOS = [
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
] as const;

export type VerifyScenario = (typeof VERIFY_SCENARIOS)[number];

export const DISRUPTIVE_SCENARIOS = new Set<VerifyScenario>([
  "redis-outage",
  "process-recovery",
  "promotion",
  "rollback",
]);

export type VerifyScenarioResult = {
  scenario: VerifyScenario;
  pass: boolean;
  at: string;
  lines: string[];
};

export type VerifyState = {
  startedAt: string;
  bootMarker: string | null;
  rebootPending: boolean;
  rebootBootMarkerBefore: string | null;
  productionRevision: string | null;
  productionBuildId: string | null;
  scenarios: Partial<Record<VerifyScenario, VerifyScenarioResult>>;
};

export type VerifyLocalEnvironmentsOptions = LocalProdOptions & {
  scenario: VerifyScenario;
  allowDisruptive: boolean;
  revisionGood: string | null;
  revisionBad: string | null;
  skipInfra: boolean;
  outputPath: string | null;
};

export type VerifyLocalEnvironmentsDeps = LocalProdDeps & {
  verifyLocalDataIsolation: typeof verifyLocalDataIsolation;
  verifyPostgresIsolation: typeof verifyPostgresIsolation;
  runDeployHealthGate: typeof runDeployHealthGate;
  runDeployCommand: (
    options: VerifyLocalEnvironmentsOptions & { revision: string },
    deps: VerifyLocalEnvironmentsDeps,
  ) => Promise<number>;
  runRollbackCommand: (
    options: VerifyLocalEnvironmentsOptions,
    deps: VerifyLocalEnvironmentsDeps,
  ) => Promise<number>;
  stopRedis: () => number;
  startRedis: () => number;
  readBootMarker: () => string | null;
  now: () => string;
};

const SECRET_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /redis(?:s)?:\/\/[^\s]+/gi,
  /EDGE_API_KEY=[^\s]+/gi,
  /EDGE_AUTH_SECRET=[^\s]+/gi,
  /password[^\s]*/gi,
];

const HELP_TEXT = `Verify concurrent local development and production environments.

Commands:
  verify <scenario|all>   Run one scenario or the full pre-reboot matrix

Scenarios:
  concurrent              Both ports serve with distinct identity
  build-isolation         Production revision/buildId unchanged after dev probe
  isolation               Postgres + Redis key isolation
  redis-outage            Production unready during Redis stop; recovery (disruptive)
  database-isolation      Dev probe writes invisible in edge_prod
  process-recovery        launchd restarts production after kill -9 (disruptive)
  reboot-prepare          Checkpoint boot marker before manual host reboot
  reboot-resume           Verify post-reboot recovery (after manual reboot)
  promotion               Deploy known-good revision (disruptive)
  rollback                Failed deploy + rollback restore (disruptive)
  broker-ownership        Dev default profile rejects TWS ownership
  all                     Non-disruptive matrix + reboot-prepare

Options:
  --scenario <name>       Alias for subcommand (verify --scenario concurrent)
  --allow-disruptive      Permit redis-outage, process-recovery, promotion, rollback
  --revision-good <sha>   Known-good revision for promotion scenario
  --revision-bad <sha>    Intentionally bad revision for rollback scenario
  --dev-root <path>       Development checkout (default: cwd)
  --prod-root <path>      Production worktree override
  --dev-env <path>        Development env file override
  --prod-env <path>       Production env file override
  --skip-infra            Skip docker compose up before verify
  --output <path>         Append redacted report lines to evidence file

Examples:
  npm run local:prod:verify -- concurrent
  npm run local:prod:verify -- all
  npm run local:prod:verify -- reboot-prepare
  npm run local:prod:verify -- reboot-resume
  npm run local:prod:verify -- --allow-disruptive redis-outage
`;

export class VerifyHelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "VerifyHelpRequestedError";
  }
}

function runtimeDir(developmentRoot: string): string {
  return join(developmentRoot, LOCAL_PROD_RUNTIME_DIR);
}

function statePath(developmentRoot: string): string {
  return join(runtimeDir(developmentRoot), VERIFY_STATE_FILE);
}

function defaultReadBootMarker(): string | null {
  try {
    return execFileSync("sysctl", ["-n", "kern.boottime"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function defaultStopRedis(): number {
  try {
    execFileSync("docker", ["compose", "stop", "redis"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return 0;
  } catch {
    return 1;
  }
}

function defaultStartRedis(): number {
  try {
    execFileSync("docker", ["compose", "up", "-d", "--wait", "redis"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return 0;
  } catch {
    return 1;
  }
}

async function defaultRunDeployCommand(
  options: VerifyLocalEnvironmentsOptions & { revision: string },
  _deps: VerifyLocalEnvironmentsDeps,
): Promise<number> {
  const { runDeployCommand, defaultDeployLocalProdDeps } = await import("./deploy-local-prod.mts");
  return runDeployCommand(
    {
      ...options,
      command: "deploy",
      revision: options.revision,
      skipStartup: true,
    },
    defaultDeployLocalProdDeps(),
  );
}

async function defaultRunRollbackCommand(
  options: VerifyLocalEnvironmentsOptions,
  _deps: VerifyLocalEnvironmentsDeps,
): Promise<number> {
  const { runRollbackCommand, defaultDeployLocalProdDeps } = await import("./deploy-local-prod.mts");
  return runRollbackCommand(
    {
      ...options,
      command: "rollback",
      revision: null,
      skipStartup: true,
    },
    defaultDeployLocalProdDeps(),
  );
}

export function defaultVerifyLocalEnvironmentsDeps(): VerifyLocalEnvironmentsDeps {
  return {
    ...defaultLocalProdDeps(),
    verifyLocalDataIsolation,
    verifyPostgresIsolation,
    runDeployHealthGate,
    runDeployCommand: defaultRunDeployCommand,
    runRollbackCommand: defaultRunRollbackCommand,
    stopRedis: defaultStopRedis,
    startRedis: defaultStartRedis,
    readBootMarker: defaultReadBootMarker,
    now: () => new Date().toISOString(),
  };
}

export function redactVerifyLine(line: string): string {
  let out = line;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  return out;
}

export function formatVerifyReport(results: VerifyScenarioResult[]): string[] {
  const lines: string[] = [];
  for (const result of results) {
    lines.push(`verify.scenario=${result.scenario} pass=${result.pass} at=${result.at}`);
    for (const detail of result.lines) {
      lines.push(redactVerifyLine(detail));
    }
  }
  return lines;
}

export function emptyVerifyState(now: string): VerifyState {
  return {
    startedAt: now,
    bootMarker: null,
    rebootPending: false,
    rebootBootMarkerBefore: null,
    productionRevision: null,
    productionBuildId: null,
    scenarios: {},
  };
}

export function readVerifyState(
  developmentRoot: string,
  deps: Pick<VerifyLocalEnvironmentsDeps, "existsSync" | "readFileSync" | "mkdirSync">,
): VerifyState | null {
  const path = statePath(developmentRoot);
  if (!deps.existsSync(path)) return null;
  try {
    return JSON.parse(deps.readFileSync(path, "utf8")) as VerifyState;
  } catch {
    return null;
  }
}

export function writeVerifyState(
  developmentRoot: string,
  state: VerifyState,
  deps: Pick<VerifyLocalEnvironmentsDeps, "mkdirSync" | "writeFileSync">,
): void {
  const dir = runtimeDir(developmentRoot);
  deps.mkdirSync(dir, { recursive: true });
  deps.writeFileSync(statePath(developmentRoot), JSON.stringify(state, null, 2) + "\n", "utf8");
}

function ensureDisruptiveAllowed(
  scenario: VerifyScenario,
  allowDisruptive: boolean,
): string | null {
  if (DISRUPTIVE_SCENARIOS.has(scenario) && !allowDisruptive) {
    return `verify.scenario=${scenario} blocked reason=requires_allow_disruptive`;
  }
  return null;
}

function profileUrl(profile: "development" | "production", path: string): string {
  const contract = LOCAL_DEPLOY_CONTRACT[profile];
  return `http://${contract.host}:${contract.port}${path}`;
}

function makeResult(
  scenario: VerifyScenario,
  pass: boolean,
  lines: string[],
  deps: Pick<VerifyLocalEnvironmentsDeps, "now">,
): VerifyScenarioResult {
  return { scenario, pass, at: deps.now(), lines };
}

export async function runConcurrentScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  input: LocalDeployInput,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const devPort = LOCAL_DEPLOY_CONTRACT.development.port;
  const prodPort = LOCAL_DEPLOY_CONTRACT.production.port;
  const devListeners = deps.listenPidsOnPort(devPort);
  const prodListeners = deps.listenPidsOnPort(prodPort);
  lines.push(`development.listeners=${devListeners.join(",") || "none"}`);
  lines.push(`production.listeners=${prodListeners.join(",") || "none"}`);

  const devHealthz = await probeHealthz(profileUrl("development", "/healthz"), deps.fetchImpl);
  const prodHealthz = await probeHealthz(profileUrl("production", "/healthz"), deps.fetchImpl);
  const devReady = await deps.probeReadyz(profileUrl("development", "/readyz"), deps.fetchImpl);
  const prodReady = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);

  lines.push(`development.healthz=${devHealthz}`);
  lines.push(`production.healthz=${prodHealthz}`);
  lines.push(`development.readyz=${devReady.ok} reasons=${devReady.reasons.join(",") || "none"}`);
  lines.push(`production.readyz=${prodReady.ok} reasons=${prodReady.reasons.join(",") || "none"}`);

  const prodReadyzUrl =
    input.production.EDGE_READYZ_URL?.trim() || profileUrl("production", "/readyz");
  lines.push(`production.readyz_url_target=${prodReadyzUrl.includes(":3000") ? "3000" : "other"}`);

  const pass =
    devListeners.length > 0 &&
    prodListeners.length > 0 &&
    devHealthz &&
    prodHealthz &&
    devReady.ok &&
    prodReady.ok &&
    prodReadyzUrl.includes(":3000");

  return makeResult("concurrent", pass, lines, deps);
}

export async function runBuildIsolationScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const beforeRevision = readWorktreeRevision(options.productionRoot, deps.execFile);
  const beforeBuildId = readBuildId(options.productionRoot, deps);
  const devRevision = readWorktreeRevision(options.developmentRoot, deps.execFile);
  lines.push(`production.revision.before=${beforeRevision ?? "unknown"}`);
  lines.push(`production.buildId.before=${beforeBuildId ?? "missing"}`);
  lines.push(`development.revision=${devRevision ?? "unknown"}`);

  const afterRevision = readWorktreeRevision(options.productionRoot, deps.execFile);
  const afterBuildId = readBuildId(options.productionRoot, deps);
  lines.push(`production.revision.after=${afterRevision ?? "unknown"}`);
  lines.push(`production.buildId.after=${afterBuildId ?? "missing"}`);

  const pass =
    beforeRevision !== null &&
    beforeRevision === afterRevision &&
    beforeBuildId !== null &&
    beforeBuildId === afterBuildId &&
    devRevision !== beforeRevision;

  return makeResult("build-isolation", pass, lines, deps);
}

export async function runIsolationScenario(
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const result = await deps.verifyLocalDataIsolation();
  for (const line of formatVerifyResult(result)) {
    lines.push(line);
  }
  return makeResult("isolation", result.pass, lines, deps);
}

export async function runDatabaseIsolationScenario(
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const result = await deps.verifyPostgresIsolation();
  lines.push(`postgres.devMarkerVisibleInProd=${result.devMarkerVisibleInProd}`);
  lines.push(`postgres.prodMarkerVisibleInDev=${result.prodMarkerVisibleInDev}`);
  lines.push(`postgres.isolation=${result.pass ? "pass" : "fail"}`);
  return makeResult("database-isolation", result.pass, lines, deps);
}

export async function runBrokerOwnershipScenario(
  input: LocalDeployInput,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const defaultIssues = validateLocalDeploy(input);
  const twsIssue = defaultIssues.find((issue) => issue.code === "development.tws_enabled");
  lines.push(`development.tws_default_issues=${defaultIssues.length}`);
  lines.push(`development.tws_enabled_blocked=${twsIssue ? "yes" : "no"}`);

  const devWithTws: LocalDeployInput = {
    ...input,
    development: { ...input.development, TWS_ENABLED: "true" },
  };
  const twsEnabledIssues = validateLocalDeploy(devWithTws);
  const failsWithTws = twsEnabledIssues.some((issue) => issue.code === "development.tws_enabled");
  lines.push(`development.tws_enabled_rejected=${failsWithTws ? "yes" : "no"}`);

  const pass = defaultIssues.length === 0 && failsWithTws;
  return makeResult("broker-ownership", pass, lines, deps);
}

export async function runRedisOutageScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  input: LocalDeployInput,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  let pass = false;
  try {
    const stopCode = deps.stopRedis();
    lines.push(`redis.stop=${stopCode === 0 ? "pass" : "fail"}`);
    await deps.sleep(2_000);

    const prodReady = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);
    const devReady = await deps.probeReadyz(profileUrl("development", "/readyz"), deps.fetchImpl);
    lines.push(`production.readyz=${prodReady.ok} reasons=${prodReady.reasons.join(",") || "none"}`);
    lines.push(`development.readyz=${devReady.ok} reasons=${devReady.reasons.join(",") || "none"}`);

    const prodFailLoud = !prodReady.ok;
    const devRequireRedisOff = input.development.EDGE_REQUIRE_REDIS !== "1";
    lines.push(`development.require_redis=${input.development.EDGE_REQUIRE_REDIS ?? "0"}`);

    const startCode = deps.startRedis();
    lines.push(`redis.start=${startCode === 0 ? "pass" : "fail"}`);
    await deps.sleep(3_000);

    const prodRecovered = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);
    lines.push(
      `production.readyz.recovered=${prodRecovered.ok} reasons=${prodRecovered.reasons.join(",") || "none"}`,
    );

    pass = stopCode === 0 && prodFailLoud && devRequireRedisOff && startCode === 0 && prodRecovered.ok;
  } finally {
    deps.startRedis();
  }
  return makeResult("redis-outage", pass, lines, deps);
}

export async function runProcessRecoveryScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const launchdLoaded = isLaunchAgentLoaded(deps);
  lines.push(`launchd.loaded=${launchdLoaded}`);
  if (!launchdLoaded) {
    lines.push("process-recovery=skipped reason=launchd_not_loaded");
    return makeResult("process-recovery", false, lines, deps);
  }

  const prodPort = LOCAL_DEPLOY_CONTRACT.production.port;
  const metaBefore = readRuntimeMeta(options.developmentRoot, deps);
  const pidBefore = metaBefore?.pid ?? deps.listenPidsOnPort(prodPort)[0] ?? null;
  lines.push(`production.pid.before=${pidBefore ?? "none"}`);

  if (pidBefore === null) {
    lines.push("process-recovery=skipped reason=no_production_listener");
    return makeResult("process-recovery", false, lines, deps);
  }

  deps.killProcess(pidBefore, "SIGKILL");
  lines.push(`production.signal=SIGKILL pid=${pidBefore}`);

  let listenersAfter: number[] = [];
  let pidAfter: number | null = null;
  let ready = { ok: false, reasons: ["readyz_unreachable"] as string[] };
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await deps.sleep(5_000);
    listenersAfter = deps.listenPidsOnPort(prodPort);
    pidAfter = listenersAfter[0] ?? readRuntimeMeta(options.developmentRoot, deps)?.pid ?? null;
    if (listenersAfter.length > 0) {
      ready = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);
      if (ready.ok) break;
    }
  }

  lines.push(`production.listeners.after=${listenersAfter.join(",") || "none"}`);
  lines.push(`production.pid.after=${pidAfter ?? "none"}`);
  lines.push(`production.readyz=${ready.ok} reasons=${ready.reasons.join(",") || "none"}`);

  const restarted =
    listenersAfter.length > 0 &&
    (pidAfter === null || pidAfter !== pidBefore) &&
    ready.ok;
  lines.push(`production.restarted=${restarted ? "yes" : "no"}`);

  return makeResult("process-recovery", restarted, lines, deps);
}

export function runRebootPrepareScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  state: VerifyState,
): VerifyScenarioResult {
  const lines: string[] = [];
  const bootMarker = deps.readBootMarker();
  state.bootMarker = bootMarker;
  state.rebootBootMarkerBefore = bootMarker;
  state.rebootPending = true;
  state.productionRevision = readWorktreeRevision(options.productionRoot, deps.execFile);
  state.productionBuildId = readBuildId(options.productionRoot, deps);
  writeVerifyState(options.developmentRoot, state, deps);

  lines.push(`reboot.boot_marker.before=${bootMarker ?? "unknown"}`);
  lines.push(`reboot.checkpoint=armed`);
  lines.push(`production.revision=${state.productionRevision ?? "unknown"}`);
  lines.push(`production.buildId=${state.productionBuildId ?? "missing"}`);
  lines.push("reboot.next=Reboot host manually, then run: npm run local:prod:verify -- reboot-resume");

  const pass = bootMarker !== null;
  return makeResult("reboot-prepare", pass, lines, deps);
}

export async function runRebootResumeScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  state: VerifyState,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  if (!state.rebootPending || !state.rebootBootMarkerBefore) {
    lines.push("reboot.resume=blocked reason=missing_reboot_prepare");
    return makeResult("reboot-resume", false, lines, deps);
  }

  const bootMarkerAfter = deps.readBootMarker();
  lines.push(`reboot.boot_marker.before=${state.rebootBootMarkerBefore}`);
  lines.push(`reboot.boot_marker.after=${bootMarkerAfter ?? "unknown"}`);
  const bootChanged = bootMarkerAfter !== null && bootMarkerAfter !== state.rebootBootMarkerBefore;
  lines.push(`reboot.boot_marker.changed=${bootChanged}`);

  const launchdLoaded = isLaunchAgentLoaded(deps);
  lines.push(`launchd.loaded=${launchdLoaded}`);

  const devPort = LOCAL_DEPLOY_CONTRACT.development.port;
  const devListeners = deps.listenPidsOnPort(devPort);
  lines.push(`development.listeners=${devListeners.join(",") || "none"}`);

  const prodReady = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);
  lines.push(`production.readyz=${prodReady.ok} reasons=${prodReady.reasons.join(",") || "none"}`);

  let dockerHealthy = false;
  try {
    deps.execFile("docker", ["compose", "ps", "--status", "running", "postgres", "redis"]);
    dockerHealthy = true;
  } catch {
    dockerHealthy = false;
  }
  lines.push(`docker.infra=${dockerHealthy ? "running" : "degraded"}`);

  const operationalRecovery =
    launchdLoaded && devListeners.length === 0 && prodReady.ok && dockerHealthy;
  lines.push(`reboot.operational_recovery=${operationalRecovery ? "pass" : "fail"}`);

  state.rebootPending = false;
  state.bootMarker = bootMarkerAfter;
  writeVerifyState(options.developmentRoot, state, deps);

  const pass = operationalRecovery;
  if (!bootChanged && operationalRecovery) {
    lines.push("reboot.note=same_boot_session operational_recovery_only");
  }

  return makeResult("reboot-resume", pass, lines, deps);
}

export async function runPromotionScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  input: LocalDeployInput,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const revision = options.revisionGood?.trim();
  if (!revision) {
    lines.push("promotion=blocked reason=missing_revision_good");
    return makeResult("promotion", false, lines, deps);
  }

  const exitCode = await deps.runDeployCommand({ ...options, revision }, deps);
  lines.push(`production.deploy.exit=${exitCode}`);
  lines.push(`production.deploy.revision=${revision}`);

  const gate = await deps.runDeployHealthGate({
    apiKey: input.production.EDGE_API_KEY ?? null,
    fetchImpl: deps.fetchImpl,
    retries: 3,
    retryDelayMs: 2_000,
  });
  lines.push(`production.health_gate=${gate.ok ? "pass" : "fail"} reasons=${gate.reasons.join(",") || "none"}`);

  const deployState = readDeployRevisionState(options.developmentRoot, deps);
  lines.push(`deploy.current=${deployState.currentSha ?? "none"}`);

  const pass = exitCode === 0 && gate.ok && deployState.currentSha !== null;
  return makeResult("promotion", pass, lines, deps);
}

export async function runRollbackScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  input: LocalDeployInput,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const badRevision = options.revisionBad?.trim();
  if (!badRevision) {
    lines.push("rollback=blocked reason=missing_revision_bad");
    return makeResult("rollback", false, lines, deps);
  }

  const beforeState = readDeployRevisionState(options.developmentRoot, deps);
  lines.push(`deploy.current.before=${beforeState.currentSha ?? "none"}`);
  lines.push(`deploy.previous.before=${beforeState.previousSha ?? "none"}`);

  const failExit = await deps.runDeployCommand(
    { ...options, revision: badRevision },
    deps,
  );
  lines.push(`production.deploy.failed.exit=${failExit}`);

  const rollbackExit = await deps.runRollbackCommand(options, deps);
  lines.push(`production.rollback.exit=${rollbackExit}`);

  const gate = await deps.runDeployHealthGate({
    apiKey: input.production.EDGE_API_KEY ?? null,
    fetchImpl: deps.fetchImpl,
    retries: 3,
    retryDelayMs: 2_000,
  });
  lines.push(`production.health_gate=${gate.ok ? "pass" : "fail"} reasons=${gate.reasons.join(",") || "none"}`);

  const afterState = readDeployRevisionState(options.developmentRoot, deps);
  lines.push(`deploy.current.after=${afterState.currentSha ?? "none"}`);
  lines.push(`deploy.previous.after=${afterState.previousSha ?? "none"}`);

  const pass =
    failExit !== 0 &&
    rollbackExit === 0 &&
    gate.ok &&
    afterState.currentSha === beforeState.currentSha;
  return makeResult("rollback", pass, lines, deps);
}

export function scenariosForCommand(scenario: VerifyScenario): VerifyScenario[] {
  if (scenario === "all") {
    return [
      "concurrent",
      "build-isolation",
      "isolation",
      "database-isolation",
      "broker-ownership",
      "reboot-prepare",
    ];
  }
  return [scenario];
}

function defaultProductionRoot(developmentRoot: string): string {
  const base = developmentRoot.replace(/[/\\]+$/, "");
  const name = base.split(/[/\\]/).pop() ?? "edge";
  return resolve(base + "-production");
}

export function parseVerifyLocalEnvironmentsArgs(
  argv: string[],
  cwd = process.cwd(),
): VerifyLocalEnvironmentsOptions {
  if (argv.includes("-h") || argv.includes("--help")) {
    throw new VerifyHelpRequestedError();
  }

  const args = [...argv];
  let scenario: VerifyScenario = "all";
  let allowDisruptive = false;
  let revisionGood: string | null = null;
  let revisionBad: string | null = null;
  let outputPath: string | null = null;
  let developmentRoot = resolve(cwd);
  let productionRoot = defaultProductionRoot(developmentRoot);
  let developmentEnvPath: string | null = null;
  let productionEnvPath: string | null = null;
  let skipInfra = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag) continue;

    if ((VERIFY_SCENARIOS as readonly string[]).includes(flag)) {
      scenario = flag as VerifyScenario;
      continue;
    }

    if (flag === "--allow-disruptive") {
      allowDisruptive = true;
      continue;
    }
    if (flag === "--skip-infra") {
      skipInfra = true;
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--scenario") {
      scenario = value as VerifyScenario;
    } else if (flag === "--dev-root") {
      developmentRoot = resolve(value);
      productionRoot = defaultProductionRoot(developmentRoot);
    } else if (flag === "--prod-root") {
      productionRoot = resolve(value);
    } else if (flag === "--dev-env") {
      developmentEnvPath = resolve(value);
    } else if (flag === "--prod-env") {
      productionEnvPath = resolve(value);
    } else if (flag === "--revision-good") {
      revisionGood = value;
    } else if (flag === "--revision-bad") {
      revisionBad = value;
    } else if (flag === "--output") {
      outputPath = resolve(value);
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
    index += 1;
  }

  if (!(VERIFY_SCENARIOS as readonly string[]).includes(scenario)) {
    throw new Error(`Unknown scenario: ${scenario}`);
  }

  if (!developmentEnvPath) {
    developmentEnvPath = join(developmentRoot, LOCAL_DEPLOY_CONTRACT.development.envFileName);
  }
  if (!productionEnvPath) {
    productionEnvPath = join(productionRoot, LOCAL_DEPLOY_CONTRACT.production.envFileName);
  }

  return {
    command: "status",
    developmentRoot,
    productionRoot,
    developmentEnvPath,
    productionEnvPath,
    revision: null,
    skipInfra,
    tailLines: 200,
    scenario,
    allowDisruptive,
    revisionGood,
    revisionBad,
    outputPath,
  };
}

export async function runVerifyScenario(
  scenario: VerifyScenario,
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  input: LocalDeployInput,
  state: VerifyState,
): Promise<VerifyScenarioResult> {
  const blocked = ensureDisruptiveAllowed(scenario, options.allowDisruptive);
  if (blocked) {
    return makeResult(scenario, false, [blocked], deps);
  }

  switch (scenario) {
    case "concurrent":
      return runConcurrentScenario(options, deps, input);
    case "build-isolation":
      return runBuildIsolationScenario(options, deps);
    case "isolation":
      return runIsolationScenario(deps);
    case "redis-outage":
      return runRedisOutageScenario(options, deps, input);
    case "database-isolation":
      return runDatabaseIsolationScenario(deps);
    case "process-recovery":
      return runProcessRecoveryScenario(options, deps);
    case "reboot-prepare":
      return runRebootPrepareScenario(options, deps, state);
    case "reboot-resume":
      return runRebootResumeScenario(options, deps, state);
    case "promotion":
      return runPromotionScenario(options, deps, input);
    case "rollback":
      return runRollbackScenario(options, deps, input);
    case "broker-ownership":
      return runBrokerOwnershipScenario(input, deps);
    default:
      return makeResult(scenario, false, [`verify.scenario=${scenario} unsupported`], deps);
  }
}

export async function runVerifyLocalEnvironmentsCommand(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps = defaultVerifyLocalEnvironmentsDeps(),
): Promise<number> {
  const input = loadDeployInputSync(options, deps);
  const preflightIssues = validateLocalDeploy(input);
  if (preflightIssues.length > 0) {
    console.error(`Local deployment preflight failed (${preflightIssues.length} issues):`);
    for (const line of formatLocalDeployIssues(preflightIssues)) {
      console.error(redactVerifyLine(`- ${line}`));
    }
    return 1;
  }

  if (!options.skipInfra) {
    try {
      execFileSync("docker", ["compose", "up", "-d", "--wait", "postgres", "redis"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      console.error("verify.infra=failed");
      return 1;
    }
  }

  const existing = readVerifyState(options.developmentRoot, deps);
  const state = existing ?? emptyVerifyState(deps.now());
  const selected = scenariosForCommand(options.scenario);
  const results: VerifyScenarioResult[] = [];

  for (const scenario of selected) {
    const result = await runVerifyScenario(scenario, options, deps, input, state);
    state.scenarios[scenario] = result;
    results.push(result);
    for (const line of formatVerifyReport([result])) {
      console.log(line);
    }
  }

  writeVerifyState(options.developmentRoot, state, deps);

  if (options.outputPath) {
    const header = `# verify-local-environments\n# at=${deps.now()}\n`;
    const body = formatVerifyReport(results).join("\n") + "\n";
    if (existsSync(options.outputPath)) {
      writeFileSync(options.outputPath, readFileSync(options.outputPath, "utf8") + "\n" + body, "utf8");
    } else {
      writeFileSync(options.outputPath, header + body, "utf8");
    }
  }

  return results.every((result) => result.pass) ? 0 : 1;
}

export async function runVerifyLocalEnvironmentsCli(
  argv: string[],
  cwd = process.cwd(),
  deps: VerifyLocalEnvironmentsDeps = defaultVerifyLocalEnvironmentsDeps(),
): Promise<number> {
  try {
    const filtered = argv[0] === "verify" ? argv.slice(1) : argv;
    const options = parseVerifyLocalEnvironmentsArgs(filtered, cwd);
    return runVerifyLocalEnvironmentsCommand(options, deps);
  } catch (error) {
    if (error instanceof VerifyHelpRequestedError) {
      console.log(HELP_TEXT.trim());
      return 0;
    }
    if (error instanceof Error) {
      console.error(error.message);
    }
    return 2;
  }
}

const entry = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === entry) {
  runVerifyLocalEnvironmentsCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
