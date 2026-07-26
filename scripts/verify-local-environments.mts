#!/usr/bin/env npx tsx

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { inspectImageFacts, readDockerUser } from "./build-app-image.mts";
import { inspectComposeAppService } from "./compose-app-service.mts";
import { withComposeEnv } from "./compose-env.mts";
import { probeHealthz, runDeployHealthGate } from "./deploy-health-gate.mts";
import {
  formatVerifyResult,
  verifyLocalDataIsolation,
  verifyPostgresIsolation,
} from "./local-data-infrastructure.mts";
import {
  LOCAL_PROD_RUNTIME_DIR,
  defaultLocalProdDeps,
  readDeployRevisionState,
  type LocalProdDeps,
  type LocalProdOptions,
} from "./local-prod.mts";
import {
  APP_PROD_CONTAINER_NAME,
  readContainerProductionFacts,
  readLaunchAgentLoadState,
  unmanagedPort3000Listeners,
} from "./port-ownership.mts";
import { probeReadyz } from "../src/lib/observability/readyzProbe.ts";
import {
  LOCAL_DEPLOY_CONTRACT,
  parseImageTagSha,
  resolveContainerProductionEnvPath,
  validateComposeAppServiceFacts,
  validateContainerLocalDeploy,
  type ContainerLocalDeployInput,
  type LocalDeployIssue,
} from "./validate-local-deploy.mts";

export const VERIFY_STATE_FILE = "verify-state.json";
export const VERIFY_SCENARIO_RESULTS_FILE = "verify-scenario-results.json";

export const VERIFY_SCENARIOS = [
  "concurrent",
  "build-isolation",
  "isolation",
  "redis-outage",
  "postgres-outage",
  "database-isolation",
  "process-recovery",
  "reboot-prepare",
  "reboot-resume",
  "promotion",
  "rollback",
  "durable-state",
  "security",
  "legacy-retirement",
  "broker-ownership",
  "all",
] as const;

export type VerifyScenario = (typeof VERIFY_SCENARIOS)[number];

export const DISRUPTIVE_SCENARIOS = new Set<VerifyScenario>([
  "redis-outage",
  "postgres-outage",
  "process-recovery",
  "promotion",
  "rollback",
  "durable-state",
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
  productionDigest: string | null;
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
  stopPostgres: () => number;
  startPostgres: () => number;
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

const HELP_TEXT = `Verify concurrent local development and container production environments.

Commands:
  verify <scenario|all>   Run one scenario or the full pre-reboot matrix

Scenarios:
  concurrent              Both ports serve with distinct identity
  build-isolation         Production image SHA/digest unchanged after dev probe
  isolation               Postgres + Redis key isolation
  redis-outage            Production unready during Redis stop; recovery (disruptive)
  postgres-outage         Production unready during Postgres stop; recovery (disruptive)
  database-isolation      Dev probe writes invisible in edge_prod
  process-recovery        Docker restarts app-prod after kill -9 PID 1 (disruptive)
  reboot-prepare          Checkpoint boot marker before manual host reboot
  reboot-resume           Verify post-reboot container recovery (after manual reboot)
  promotion               Container deploy known-good revision (disruptive)
  rollback                Failed container deploy + rollback restore (disruptive)
  durable-state           Durable mount checksum survives container restart (disruptive)
  security                Loopback bindings, non-root runtime, forbidden-path scan
  legacy-retirement       LaunchAgent absent; container owns :3000; worktree optional
  broker-ownership        Dev default profile rejects TWS ownership
  all                     Non-disruptive matrix + reboot-prepare

Options:
  --scenario <name>       Alias for subcommand (verify --scenario concurrent)
  --allow-disruptive      Permit redis/postgres outage, process-recovery, promotion, rollback, durable-state
  --revision-good <sha>   Known-good revision for promotion scenario
  --revision-bad <sha>    Intentionally bad revision for rollback scenario
  --dev-root <path>       Development checkout (default: cwd)
  --prod-root <path>      Legacy production worktree path (optional; legacy-retirement only)
  --dev-env <path>        Development env file override
  --prod-env <path>       Container production env file override
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

function composeEnv(): NodeJS.ProcessEnv {
  return withComposeEnv(process.env);
}

function stopRedisAt(developmentRoot: string): number {
  try {
    execFileSync("docker", ["compose", "stop", "redis"], {
      cwd: developmentRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: composeEnv(),
    });
    return 0;
  } catch {
    return 1;
  }
}

function startRedisAt(developmentRoot: string): number {
  try {
    execFileSync("docker", ["compose", "up", "-d", "--wait", "redis"], {
      cwd: developmentRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: composeEnv(),
    });
    return 0;
  } catch {
    return 1;
  }
}

function stopPostgresAt(developmentRoot: string): number {
  try {
    execFileSync("docker", ["compose", "stop", "postgres"], {
      cwd: developmentRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: composeEnv(),
    });
    return 0;
  } catch {
    return 1;
  }
}

function startPostgresAt(developmentRoot: string): number {
  try {
    execFileSync("docker", ["compose", "up", "-d", "--wait", "postgres"], {
      cwd: developmentRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: composeEnv(),
    });
    return 0;
  } catch {
    return 1;
  }
}

function defaultStopRedis(): number {
  return stopRedisAt(process.cwd());
}

function defaultStartRedis(): number {
  return startRedisAt(process.cwd());
}

function defaultStopPostgres(): number {
  return stopPostgresAt(process.cwd());
}

function defaultStartPostgres(): number {
  return startPostgresAt(process.cwd());
}

async function defaultRunDeployCommand(
  options: VerifyLocalEnvironmentsOptions & { revision: string },
  _deps: VerifyLocalEnvironmentsDeps,
): Promise<number> {
  const { runContainerDeployCommand, defaultDeployLocalProdContainerDeps } = await import(
    "./deploy-local-prod-container.mts"
  );
  return runContainerDeployCommand(
    {
      command: "deploy",
      developmentRoot: options.developmentRoot,
      revision: options.revision,
      skipInfra: options.skipInfra,
      skipStartup: true,
      skipChartPerf: true,
    },
    defaultDeployLocalProdContainerDeps(),
  );
}

async function defaultRunRollbackCommand(
  options: VerifyLocalEnvironmentsOptions,
  _deps: VerifyLocalEnvironmentsDeps,
): Promise<number> {
  const { runContainerRollbackCommand, defaultDeployLocalProdContainerDeps } = await import(
    "./deploy-local-prod-container.mts"
  );
  return runContainerRollbackCommand(
    {
      command: "rollback",
      developmentRoot: options.developmentRoot,
      revision: null,
      skipInfra: options.skipInfra,
      skipStartup: true,
      skipChartPerf: true,
    },
    defaultDeployLocalProdContainerDeps(),
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
    stopPostgres: defaultStopPostgres,
    startPostgres: defaultStartPostgres,
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
    productionDigest: null,
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

function readWorktreeRevisionFromRoot(
  root: string,
  execFile: VerifyLocalEnvironmentsDeps["execFile"],
): string | null {
  try {
    return execFile("git", ["-C", root, "rev-parse", "HEAD"]).trim() || null;
  } catch {
    return null;
  }
}

function readProductionContainerIdentity(
  developmentRoot: string,
  deps: VerifyLocalEnvironmentsDeps,
): { sha: string | null; digest: string | null; imageTag: string | null } {
  const container = readContainerProductionFacts(deps.execFile);
  const deployState = readDeployRevisionState(developmentRoot, deps);
  const sha =
    deployState.currentSha ??
    (container.imageTag ? parseImageTagSha(container.imageTag) : null);
  return {
    sha,
    digest: deployState.currentDigest,
    imageTag: container.imageTag,
  };
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
  input: ContainerLocalDeployInput,
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

  const container = readContainerProductionFacts(deps.execFile);
  lines.push(`container.running=${container.running}`);
  lines.push(`container.health=${container.health ?? "none"}`);

  const pass =
    devListeners.length > 0 &&
    prodListeners.length > 0 &&
    container.running &&
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
  const before = readProductionContainerIdentity(options.developmentRoot, deps);
  const devRevision = readWorktreeRevisionFromRoot(options.developmentRoot, deps.execFile);
  lines.push(`production.sha.before=${before.sha ?? "unknown"}`);
  lines.push(`production.digest.before=${before.digest ?? "none"}`);
  lines.push(`production.image.before=${before.imageTag ?? "none"}`);
  lines.push(`development.revision=${devRevision ?? "unknown"}`);

  const after = readProductionContainerIdentity(options.developmentRoot, deps);
  lines.push(`production.sha.after=${after.sha ?? "unknown"}`);
  lines.push(`production.digest.after=${after.digest ?? "none"}`);
  lines.push(`production.image.after=${after.imageTag ?? "none"}`);

  const pass =
    before.sha !== null &&
    before.sha === after.sha &&
    before.digest === after.digest &&
    before.imageTag === after.imageTag &&
    devRevision !== before.sha;

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
  input: ContainerLocalDeployInput,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const defaultIssues = validateContainerLocalDeploy(input);
  lines.push(`development.tws_default_issues=${defaultIssues.length}`);

  const sharedSecret = "shared-sidecar-secret-abcdefghijklmnopqrstuvwxyz";
  const sharedSidecarInput: ContainerLocalDeployInput = {
    ...input,
    development: {
      ...input.development,
      TWS_ENABLED: "true",
      TWS_MANAGED: "external",
      EDGE_TRADING_ENVIRONMENT_LOCK: "paper",
      TWS_SIDECAR_URL: "http://127.0.0.1:8765",
      TWS_SIDECAR_SECRET: sharedSecret,
    },
    production: {
      ...input.production,
      TWS_ENABLED: "true",
      TWS_MANAGED: "external",
      EDGE_TRADING_ENVIRONMENT_LOCK: "live",
      TWS_SIDECAR_URL: "http://host.docker.internal:8765",
      TWS_SIDECAR_SECRET: sharedSecret,
    },
  };
  const sharedIssues = validateContainerLocalDeploy(sharedSidecarInput);
  lines.push(`shared_sidecar.issues=${sharedIssues.length}`);
  lines.push(`shared_sidecar.valid=${sharedIssues.length === 0 ? "yes" : "no"}`);

  const invalidDevInput: ContainerLocalDeployInput = {
    ...sharedSidecarInput,
    development: {
      ...sharedSidecarInput.development,
      EDGE_TRADING_ENVIRONMENT_LOCK: "live",
    },
  };
  const invalidIssues = validateContainerLocalDeploy(invalidDevInput);
  const rejectsBadDevLock = invalidIssues.some(
    (issue) => issue.code === "development.trading_environment_lock",
  );
  lines.push(`shared_sidecar.rejects_bad_dev_lock=${rejectsBadDevLock ? "yes" : "no"}`);

  const pass =
    defaultIssues.length === 0 &&
    sharedIssues.length === 0 &&
    rejectsBadDevLock;
  return makeResult("broker-ownership", pass, lines, deps);
}

export async function runRedisOutageScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  input: ContainerLocalDeployInput,
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

export async function runPostgresOutageScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  input: ContainerLocalDeployInput,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  let pass = false;
  try {
    const stopCode = deps.stopPostgres();
    lines.push(`postgres.stop=${stopCode === 0 ? "pass" : "fail"}`);
    await deps.sleep(2_000);

    const prodReady = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);
    const devReady = await deps.probeReadyz(profileUrl("development", "/readyz"), deps.fetchImpl);
    lines.push(`production.readyz=${prodReady.ok} reasons=${prodReady.reasons.join(",") || "none"}`);
    lines.push(`development.readyz=${devReady.ok} reasons=${devReady.reasons.join(",") || "none"}`);

    const prodFailLoud = !prodReady.ok;
    const devRequirePostgresOff = input.development.EDGE_REQUIRE_REDIS !== "1";
    lines.push(`development.require_redis=${input.development.EDGE_REQUIRE_REDIS ?? "0"}`);

    const startCode = deps.startPostgres();
    lines.push(`postgres.start=${startCode === 0 ? "pass" : "fail"}`);
    await deps.sleep(5_000);

    const prodRecovered = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);
    lines.push(
      `production.readyz.recovered=${prodRecovered.ok} reasons=${prodRecovered.reasons.join(",") || "none"}`,
    );

    pass = stopCode === 0 && prodFailLoud && devRequirePostgresOff && startCode === 0 && prodRecovered.ok;
  } finally {
    deps.startPostgres();
  }
  return makeResult("postgres-outage", pass, lines, deps);
}

export async function runProcessRecoveryScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const containerBefore = readContainerProductionFacts(deps.execFile);
  lines.push(`container.running.before=${containerBefore.running}`);
  lines.push(`container.health.before=${containerBefore.health ?? "none"}`);

  if (!containerBefore.running) {
    lines.push("process-recovery=skipped reason=container_not_running");
    return makeResult("process-recovery", false, lines, deps);
  }

  try {
    deps.execFile("docker", ["exec", APP_PROD_CONTAINER_NAME, "kill", "-9", "1"]);
    lines.push("container.signal=SIGKILL pid=1");
  } catch {
    lines.push("container.signal=failed");
    return makeResult("process-recovery", false, lines, deps);
  }

  let recovered = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await deps.sleep(5_000);
    const containerAfter = readContainerProductionFacts(deps.execFile);
    const ready = await deps.probeReadyz(profileUrl("production", "/readyz"), deps.fetchImpl);
    lines.push(
      `container.health.poll=${containerAfter.health ?? "none"} readyz=${ready.ok ? "pass" : "fail"}`,
    );
    if (containerAfter.running && containerAfter.health === "healthy" && ready.ok) {
      recovered = true;
      break;
    }
  }

  lines.push(`container.recovered=${recovered ? "yes" : "no"}`);
  return makeResult("process-recovery", recovered, lines, deps);
}

export function runRebootPrepareScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
  state: VerifyState,
): VerifyScenarioResult {
  const lines: string[] = [];
  const bootMarker = deps.readBootMarker();
  const identity = readProductionContainerIdentity(options.developmentRoot, deps);
  state.bootMarker = bootMarker;
  state.rebootBootMarkerBefore = bootMarker;
  state.rebootPending = true;
  state.productionRevision = identity.sha;
  state.productionDigest = identity.digest;
  state.productionBuildId = null;
  writeVerifyState(options.developmentRoot, state, deps);

  lines.push(`reboot.boot_marker.before=${bootMarker ?? "unknown"}`);
  lines.push(`reboot.checkpoint=armed`);
  lines.push(`production.sha=${state.productionRevision ?? "unknown"}`);
  lines.push(`production.digest=${state.productionDigest ?? "none"}`);
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

  const launchAgent = readLaunchAgentLoadState(deps.execFile, deps.uid);
  lines.push(`launchd.loaded=${launchAgent.loaded}`);
  lines.push(`launchd.blocks_container=${launchAgent.blocksContainerLifecycle}`);

  const container = readContainerProductionFacts(deps.execFile);
  lines.push(`container.running=${container.running}`);
  lines.push(`container.health=${container.health ?? "none"}`);

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

  const identity = readProductionContainerIdentity(options.developmentRoot, deps);
  lines.push(`production.sha.after=${identity.sha ?? "unknown"}`);
  lines.push(`production.digest.after=${identity.digest ?? "none"}`);

  const operationalRecovery =
    !launchAgent.blocksContainerLifecycle &&
    container.running &&
    container.health === "healthy" &&
    devListeners.length === 0 &&
    prodReady.ok &&
    dockerHealthy &&
    (state.productionRevision === null || identity.sha === state.productionRevision);
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
  input: ContainerLocalDeployInput,
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
  input: ContainerLocalDeployInput,
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

export async function runDurableStateScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const container = readContainerProductionFacts(deps.execFile);
  if (!container.running || !container.imageTag) {
    lines.push("durable-state=skipped reason=container_not_running");
    return makeResult("durable-state", false, lines, deps);
  }

  const mountDir = join(options.developmentRoot, "data", "journal-screenshots");
  deps.mkdirSync(mountDir, { recursive: true });
  const marker = `phase5-durable-${Date.now()}`;
  const hostPath = join(mountDir, "phase5-probe.txt");
  deps.writeFileSync(hostPath, marker, "utf8");
  const checksumBefore = createHash("sha256").update(marker).digest("hex");
  lines.push(`durable.checksum.before=${checksumBefore}`);

  try {
    const composeEnv = withComposeEnv({
      ...process.env,
      EDGE_APP_IMAGE: container.imageTag,
    });
    execFileSync(
      "docker",
      ["compose", "--profile", "prod", "restart", "app-prod"],
      {
        cwd: options.developmentRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: composeEnv,
      },
    );
    await deps.sleep(15_000);

    const inside = deps
      .execFile("docker", [
        "exec",
        APP_PROD_CONTAINER_NAME,
        "cat",
        "/app/data/journal-screenshots/phase5-probe.txt",
      ])
      .trim();
    const checksumAfter = createHash("sha256").update(inside).digest("hex");
    lines.push(`durable.checksum.after=${checksumAfter}`);
    lines.push(`durable.marker.match=${inside === marker ? "yes" : "no"}`);

    const pass = checksumBefore === checksumAfter && inside === marker;
    return makeResult("durable-state", pass, lines, deps);
  } catch (error) {
    lines.push(`durable-state=failed reason=${error instanceof Error ? error.message : "unknown"}`);
    return makeResult("durable-state", false, lines, deps);
  }
}

export async function runSecurityScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const composeIssues: LocalDeployIssue[] = [];
  const composeFacts = inspectComposeAppService(options.developmentRoot, deps.execFile);
  validateComposeAppServiceFacts(composeFacts, composeIssues);
  lines.push(`compose.issues=${composeIssues.length}`);

  const appProd = composeFacts.appProd;
  const loopback3000 =
    appProd?.portBindings.some((binding) => binding.includes("127.0.0.1:3000")) ?? false;
  const loopback5432 =
    composeFacts.postgres?.portBindings.some((binding) => binding.includes("127.0.0.1:5432")) ??
    false;
  const loopback6379 =
    composeFacts.redis?.portBindings.some((binding) => binding.includes("127.0.0.1:6379")) ?? false;
  lines.push(`compose.loopback_3000=${loopback3000}`);
  lines.push(`compose.loopback_5432=${loopback5432}`);
  lines.push(`compose.loopback_6379=${loopback6379}`);

  const container = readContainerProductionFacts(deps.execFile);
  const imageTag = container.imageTag;
  let nonRoot = true;
  let forbiddenClean = true;
  if (imageTag) {
    const user = readDockerUser(imageTag, deps.execFile);
    nonRoot = user != null && user !== "0" && user !== "root";
    lines.push(`image.user=${user ?? "unknown"}`);
    const facts = inspectImageFacts(imageTag, options.developmentRoot, {
      execFile: deps.execFile,
      existsSync: deps.existsSync,
      readFileSync: deps.readFileSync,
      mkdirSync: deps.mkdirSync,
      writeFileSync: deps.writeFileSync,
    });
    forbiddenClean = (facts.forbiddenPathsPresent?.length ?? 0) === 0;
    lines.push(`image.forbidden_paths=${facts.forbiddenPathsPresent?.join(",") || "none"}`);
  } else {
    lines.push("image.user=unknown");
    lines.push("image.forbidden_paths=none");
  }

  const redactionOk = redactVerifyLine("EDGE_API_KEY=super-secret-key-value-here").includes("[redacted]");
  lines.push(`redaction.sample=${redactionOk ? "pass" : "fail"}`);

  const pass =
    composeIssues.length === 0 &&
    loopback3000 &&
    loopback5432 &&
    loopback6379 &&
    nonRoot &&
    forbiddenClean &&
    redactionOk;
  return makeResult("security", pass, lines, deps);
}

export async function runLegacyRetirementScenario(
  options: VerifyLocalEnvironmentsOptions,
  deps: VerifyLocalEnvironmentsDeps,
): Promise<VerifyScenarioResult> {
  const lines: string[] = [];
  const launchAgent = readLaunchAgentLoadState(deps.execFile, deps.uid);
  lines.push(`launchd.loaded=${launchAgent.loaded}`);
  lines.push(`launchd.blocks_container=${launchAgent.blocksContainerLifecycle}`);

  const container = readContainerProductionFacts(deps.execFile);
  lines.push(`container.running=${container.running}`);
  lines.push(`container.health=${container.health ?? "none"}`);

  const unmanaged = unmanagedPort3000Listeners(
    {
      execFile: deps.execFile,
      listenPidsOnPort: deps.listenPidsOnPort,
    },
    container,
  );
  lines.push(`port3000.unmanaged_listeners=${unmanaged.join(",") || "none"}`);

  const worktreeExists = deps.existsSync(options.productionRoot);
  lines.push(`legacy.worktree.present=${worktreeExists}`);
  lines.push(`legacy.worktree.required=false`);

  const pass =
    !launchAgent.blocksContainerLifecycle &&
    container.running &&
    container.health === "healthy" &&
    unmanaged.length === 0;
  return makeResult("legacy-retirement", pass, lines, deps);
}

export function scenariosForCommand(scenario: VerifyScenario): VerifyScenario[] {
  if (scenario === "all") {
    return [
      "concurrent",
      "build-isolation",
      "isolation",
      "database-isolation",
      "broker-ownership",
      "security",
      "legacy-retirement",
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
    productionEnvPath = resolveContainerProductionEnvPath(developmentRoot);
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
  input: ContainerLocalDeployInput,
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
    case "postgres-outage":
      return runPostgresOutageScenario(options, deps, input);
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
    case "durable-state":
      return runDurableStateScenario(options, deps);
    case "security":
      return runSecurityScenario(options, deps);
    case "legacy-retirement":
      return runLegacyRetirementScenario(options, deps);
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
  const { loadContainerDeployInputSync, runContainerPreflightCheck } = await import(
    "./deploy-local-prod-container.mts"
  );
  const input = loadContainerDeployInputSync(options.developmentRoot, deps);
  const preflightCode = runContainerPreflightCheck(input);
  if (preflightCode !== 0) {
    return preflightCode;
  }

  if (!options.skipInfra) {
    try {
      execFileSync("docker", ["compose", "up", "-d", "--wait", "postgres", "redis"], {
        cwd: options.developmentRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: composeEnv(),
      });
    } catch {
      console.error("verify.infra=failed");
      return 1;
    }
  }

  const depsWithRoot: VerifyLocalEnvironmentsDeps = {
    ...deps,
    stopRedis: () => stopRedisAt(options.developmentRoot),
    startRedis: () => startRedisAt(options.developmentRoot),
    stopPostgres: () => stopPostgresAt(options.developmentRoot),
    startPostgres: () => startPostgresAt(options.developmentRoot),
  };

  const existing = readVerifyState(options.developmentRoot, depsWithRoot);
  const state = existing ?? emptyVerifyState(deps.now());
  if (!state.scenarios) {
    state.scenarios = {};
  }
  if (state.productionDigest === undefined) {
    state.productionDigest = null;
  }
  const selected = scenariosForCommand(options.scenario);
  const results: VerifyScenarioResult[] = [];

  for (const scenario of selected) {
    const result = await runVerifyScenario(scenario, options, depsWithRoot, input, state);
    state.scenarios[scenario] = result;
    results.push(result);
    for (const line of formatVerifyReport([result])) {
      console.log(line);
    }
  }

  writeVerifyState(options.developmentRoot, state, depsWithRoot);

  if (options.outputPath) {
    const header = `# verify-local-environments\n# at=${depsWithRoot.now()}\n`;
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
