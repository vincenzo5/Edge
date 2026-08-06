#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parse } from "dotenv";

import {
  edgeAppRetainTagsFromState,
  imageTagForSha,
  inspectImageFacts,
  migrateImageTagForSha,
  pruneEdgeAppImages,
  readImageDigest,
  runBuildCommand,
  runMigrateImageCommand,
  defaultBuildAppImageDeps,
  type BuildAppImageDeps,
} from "./build-app-image.mts";
import { classifyMigrationChanges } from "./deploy-migration-policy.mts";
import { runDeployHealthGate } from "./deploy-health-gate.mts";
import { resolveGitRevision } from "./deploy-local-prod.mts";
import { loadProfileEnvIntoProcess } from "./load-deploy-env.mts";
import {
  assertContainerLifecycleAllowed,
  APP_PROD_CONTAINER_NAME,
  isLaunchAgentBlockingContainer,
  readContainerProductionFacts,
  readLaunchAgentLoadState,
} from "./port-ownership.mts";
import { runLocalInfraUp } from "./local-data-infrastructure.mts";
import {
  defaultLocalProdDeps,
  isLaunchAgentLoaded,
  readDeployRevisionState,
  writeDeployRevisionState,
  type LocalProdDeployRevisionState,
  type LocalProdDeps,
} from "./local-prod.mts";
import {
  runMigrateCommand,
  runStartCommand,
  type LocalProdContainerOptions,
} from "./local-prod-container.mts";
import { runLocalProdServiceCli } from "./local-prod-service.mts";
import {
  formatLocalDeployIssues,
  LOCAL_DEPLOY_CONTRACT,
  resolveContainerProductionEnvPath,
  validateContainerLocalDeploy,
  type ContainerImageFacts,
  type ContainerLocalDeployInput,
} from "./validate-local-deploy.mts";

export type DeployLocalProdContainerCommand = "deploy" | "rollback";

export type DeployLocalProdContainerOptions = {
  command: DeployLocalProdContainerCommand;
  developmentRoot: string;
  revision: string | null;
  skipInfra: boolean;
  skipStartup: boolean;
  skipChartPerf: boolean;
  skipTypecheck: boolean;
};

export type DeployLocalProdContainerDeps = LocalProdDeps & {
  buildDeps: BuildAppImageDeps;
  runStartupCheck: () => number;
  runChartPerfCheck: () => number;
  runTypecheckCheck: () => number;
  runInfraUp: () => number;
  runContainerMigrate: (options: LocalProdContainerOptions) => number;
  runContainerStart: (options: LocalProdContainerOptions) => number;
  runHealthGate: (
    developmentRoot: string,
  ) => Promise<Awaited<ReturnType<typeof runDeployHealthGate>>>;
  readContainerBuildId: () => string | null;
  stopServiceIfLoaded: () => Promise<number>;
  buildRuntimeAndMigrateImages?: (developmentRoot: string, targetSha: string) => number;
};

const HELP_TEXT = `Local production container deploy and rollback.

Commands:
  deploy     Build and promote edge-app:<full-git-sha> to production (requires --revision)
  rollback   Restore the previous known-good container image

Options:
  --revision <sha|tag>  Required for deploy
  --dev-root <path>     Development checkout (default: cwd)
  --skip-infra          Skip docker compose up before migrate/start
  --skip-startup        Skip npm run check:startup gate
  --skip-chart-perf     Skip CHART_PERF_BUDGET_STRICT=1 npm run perf:chart gate
  --skip-typecheck      Skip npx tsc -p tsconfig.prod-check.json --noEmit gate

Examples:
  npm run local:prod:container:deploy -- --revision HEAD
  npm run local:prod:container:rollback
`;

export class ContainerDeployHelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "ContainerDeployHelpRequestedError";
  }
}

export function parseDeployLocalProdContainerArgs(
  argv: string[],
  cwd = process.cwd(),
): DeployLocalProdContainerOptions {
  const args = [...argv];
  const knownCommands: DeployLocalProdContainerCommand[] = ["deploy", "rollback"];
  let command: DeployLocalProdContainerCommand | null = null;
  if (args[0] && knownCommands.includes(args[0] as DeployLocalProdContainerCommand)) {
    command = args.shift() as DeployLocalProdContainerCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new ContainerDeployHelpRequestedError();
    }
    throw new Error("Missing command. Use: deploy | rollback");
  }

  let developmentRoot = resolve(cwd);
  let revision: string | null = null;
  let skipInfra = false;
  let skipStartup = false;
  let skipChartPerf = false;
  let skipTypecheck = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new ContainerDeployHelpRequestedError();
    }
    if (flag === "--skip-infra") {
      skipInfra = true;
      continue;
    }
    if (flag === "--skip-startup") {
      skipStartup = true;
      continue;
    }
    if (flag === "--skip-chart-perf") {
      skipChartPerf = true;
      continue;
    }
    if (flag === "--skip-typecheck") {
      skipTypecheck = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag ?? "argument"} requires a value`);
    }
    if (flag === "--dev-root") {
      developmentRoot = resolve(value);
    } else if (flag === "--revision") {
      revision = value;
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
    index += 1;
  }

  return { command, developmentRoot, revision, skipInfra, skipStartup, skipChartPerf, skipTypecheck };
}

export function loadContainerDeployInputSync(
  developmentRoot: string,
  deps: Pick<LocalProdDeps, "existsSync" | "readFileSync" | "statSync" | "execFile" | "uid">,
  imageFacts?: ContainerImageFacts,
): ContainerLocalDeployInput {
  const developmentEnvPath = join(
    developmentRoot,
    LOCAL_DEPLOY_CONTRACT.development.envFileName,
  );
  const productionEnvPath = resolveContainerProductionEnvPath(developmentRoot);

  let development: Record<string, string> = {};
  let production: Record<string, string> = {};
  try {
    development = parse(
      deps.existsSync(developmentEnvPath)
        ? deps.readFileSync(developmentEnvPath, "utf8")
        : "",
    );
  } catch {
    development = {};
  }
  try {
    production = parse(
      deps.existsSync(productionEnvPath)
        ? deps.readFileSync(productionEnvPath, "utf8")
        : "",
    );
  } catch {
    production = {};
  }

  let productionEnvFile: ContainerLocalDeployInput["productionEnvFile"] = {
    exists: false,
    mode: null,
  };
  if (deps.existsSync(productionEnvPath)) {
    productionEnvFile = {
      exists: true,
      mode: deps.statSync(productionEnvPath).mode & 0o777,
    };
  }

  const launchAgent = readLaunchAgentLoadState(deps.execFile, deps.uid);
  const container = readContainerProductionFacts(deps.execFile);

  return {
    development,
    production,
    developmentRoot,
    productionEnvPath,
    productionEnvFile,
    portOwnership: {
      legacyLaunchAgentLoaded: launchAgent.loaded,
      containerBoundPort3000: container.running,
    },
    imageFacts,
  };
}

export function runContainerPreflightCheck(input: ContainerLocalDeployInput): number {
  const issues = validateContainerLocalDeploy(input);
  if (issues.length > 0) {
    console.error(`Container production preflight failed (${issues.length} issues):`);
    for (const line of formatLocalDeployIssues(issues)) {
      console.error(`- ${line}`);
    }
    return 1;
  }
  console.log("Container production preflight passed: profiles=2 issues=0");
  return 0;
}

export function assertDockerContainerHealthy(
  execFile: LocalProdDeps["execFile"],
): { ok: boolean; reason: string | null } {
  const container = readContainerProductionFacts(execFile);
  if (!container.running) {
    return { ok: false, reason: "container_not_running" };
  }
  if (container.health !== "healthy") {
    return { ok: false, reason: `docker_health_${container.health ?? "unknown"}` };
  }
  return { ok: true, reason: null };
}

export function imageExists(
  imageTag: string,
  execFile: LocalProdDeps["execFile"],
): boolean {
  try {
    execFile("docker", ["image", "inspect", imageTag]);
    return true;
  } catch {
    return false;
  }
}

function containerOptions(
  developmentRoot: string,
  imageTag: string,
  skipInfra: boolean,
): LocalProdContainerOptions {
  return {
    command: "start",
    developmentRoot,
    imageTag,
    revision: null,
    skipInfra,
    tailLines: 200,
    skipWorktree: false,
  };
}

function validateImageFactsForDeploy(
  imageTag: string,
  developmentRoot: string,
  buildDeps: BuildAppImageDeps,
  deps: Pick<LocalProdDeps, "existsSync" | "readFileSync" | "statSync" | "execFile" | "uid">,
): number {
  let facts: ContainerImageFacts;
  try {
    facts = inspectImageFacts(imageTag, developmentRoot, buildDeps);
  } catch (error) {
    console.error("container.deploy=failed reason=image_inspect");
    console.error(error instanceof Error ? error.message : "Image inspect failed.");
    return 1;
  }

  const issues = validateContainerLocalDeploy(
    loadContainerDeployInputSync(developmentRoot, deps, facts),
  );
  if (issues.length > 0) {
    console.error(`container.deploy=failed reason=image_contract issues=${issues.length}`);
    for (const line of formatLocalDeployIssues(issues)) {
      console.error(`- ${line}`);
    }
    return 1;
  }
  return 0;
}

function buildRuntimeAndMigrateImages(
  developmentRoot: string,
  targetSha: string,
  buildDeps: BuildAppImageDeps,
): number {
  const buildCode = runBuildCommand(
    {
      command: "build",
      developmentRoot,
      revision: targetSha,
      imageTag: null,
      dockerTarget: "runtime",
      skipWorktree: false,
    },
    buildDeps,
  );
  if (buildCode !== 0) return buildCode;

  const imageTag = imageTagForSha(targetSha);
  return runMigrateImageCommand(
    {
      command: "migrate-image",
      developmentRoot,
      revision: targetSha,
      imageTag,
      dockerTarget: "migrate",
      skipWorktree: false,
    },
    buildDeps,
  );
}

async function stopLaunchdIfLoaded(deps: LocalProdDeps): Promise<number> {
  if (!isLaunchAgentLoaded(deps)) return 0;
  return runLocalProdServiceCli(["stop"], process.cwd());
}

function assertDeployOwnershipAllowed(deps: LocalProdDeps): string | null {
  if (isLaunchAgentBlockingContainer(deps.execFile, deps.uid)) {
    return "LaunchAgent owns production lifecycle. Stop the service before container deploy.";
  }
  return assertContainerLifecycleAllowed({
    execFile: deps.execFile,
    listenPidsOnPort: deps.listenPidsOnPort,
    isLaunchAgentLoaded: () => isLaunchAgentLoaded(deps),
    launchAgentBlocksContainer: () =>
      isLaunchAgentBlockingContainer(deps.execFile, deps.uid),
  });
}

function readBuildIdFromContainer(execFile: LocalProdDeps["execFile"]): string | null {
  try {
    const value = execFile("docker", [
      "exec",
      APP_PROD_CONTAINER_NAME,
      "cat",
      "/app/.next/BUILD_ID",
    ]).trim();
    return value || null;
  } catch {
    return null;
  }
}

/** Undo `npm run perf:chart` worktree writes so image build can require a clean tree. */
export function restoreWorktreeAfterChartPerf(developmentRoot: string): void {
  execFileSync(
    "git",
    [
      "-C",
      developmentRoot,
      "checkout",
      "--",
      "docs/perf/chart-baseline-latest.json",
      "docs/perf/runtime-interaction-baseline-latest.json",
      "examples/chart-perf-harness/dist-browser",
    ],
    { stdio: "ignore" },
  );
  execFileSync(
    "git",
    [
      "-C",
      developmentRoot,
      "clean",
      "-fd",
      "--",
      "docs/perf",
      "examples/chart-perf-harness/dist-browser",
    ],
    { stdio: "ignore" },
  );
}

export function defaultDeployLocalProdContainerDeps(): DeployLocalProdContainerDeps {
  const base = defaultLocalProdDeps();
  const buildDeps = defaultBuildAppImageDeps();

  return {
    ...base,
    buildDeps,
    runStartupCheck: () => {
      try {
        execFileSync("npm", ["run", "check:startup"], {
          cwd: process.cwd(),
          stdio: "inherit",
          env: process.env,
        });
        return 0;
      } catch {
        return 1;
      }
    },
    runChartPerfCheck: () => {
      try {
        execFileSync("npm", ["run", "perf:chart"], {
          cwd: process.cwd(),
          stdio: "inherit",
          env: {
            ...process.env,
            CHART_PERF_BUDGET_STRICT: "1",
          },
        });
        // perf:chart rewrites tracked baselines / harness dist; restore a clean
        // worktree so the detached image build context check can pass.
        restoreWorktreeAfterChartPerf(process.cwd());
        return 0;
      } catch {
        return 1;
      }
    },
    runTypecheckCheck: () => {
      try {
        execFileSync("npx", ["tsc", "-p", "tsconfig.prod-check.json", "--noEmit"], {
          cwd: process.cwd(),
          stdio: "inherit",
          env: process.env,
        });
        return 0;
      } catch {
        return 1;
      }
    },
    runInfraUp: () => {
      try {
        return runLocalInfraUp();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        return 1;
      }
    },
    runContainerMigrate: (options) => runMigrateCommand({ ...options, command: "migrate" }),
    runContainerStart: (options) => runStartCommand({ ...options, command: "start" }),
    runHealthGate: async (developmentRoot) => {
      loadProfileEnvIntoProcess(developmentRoot, "production", { runtimeMode: "container" });
      const apiKey = process.env.EDGE_API_KEY?.trim() ?? null;
      return runDeployHealthGate({
        apiKey,
        fetchImpl: base.fetchImpl,
        sleep: base.sleep,
      });
    },
    readContainerBuildId: () => readBuildIdFromContainer(base.execFile),
    stopServiceIfLoaded: async () => stopLaunchdIfLoaded(base),
  };
}

function pruneAfterPromotion(
  developmentRoot: string,
  state: LocalProdDeployRevisionState,
  deps: DeployLocalProdContainerDeps,
): void {
  const retain = edgeAppRetainTagsFromState(state);
  const result = pruneEdgeAppImages(retain, deps.buildDeps.execFile);
  if (result.removed.length > 0) {
    console.log(`container.images.pruned=${result.removed.length}`);
  }
}

export async function runContainerDeployCommand(
  options: DeployLocalProdContainerOptions,
  deps: DeployLocalProdContainerDeps = defaultDeployLocalProdContainerDeps(),
): Promise<number> {
  if (!options.revision) {
    console.error("Error: --revision is required for deploy.");
    console.error("  npm run local:prod:container:deploy -- --revision <sha|tag>");
    return 2;
  }

  const targetSha = resolveGitRevision(options.developmentRoot, options.revision, deps.execFile);
  const imageTag = imageTagForSha(targetSha);
  const deployState = readDeployRevisionState(options.developmentRoot, deps);
  const fromSha = deployState.currentSha;

  const migrationPolicy = classifyMigrationChanges(
    deps.execFile,
    options.developmentRoot,
    fromSha,
    targetSha,
  );
  if (!migrationPolicy.ok) {
    if (migrationPolicy.reason === "destructive") {
      console.error("Deploy blocked: destructive migration SQL detected.");
      for (const file of migrationPolicy.files) {
        console.error(`- ${file}`);
      }
      console.error("Resolve manually or use an additive-only migration for one-step rollback.");
      return 1;
    }
    console.error(`Deploy blocked: ${migrationPolicy.message}`);
    return 1;
  }

  const ownershipError = assertDeployOwnershipAllowed(deps);
  if (ownershipError) {
    console.error(ownershipError);
    return 1;
  }

  if (!options.skipStartup) {
    const startup = deps.runStartupCheck();
    if (startup !== 0) {
      console.error("Deploy blocked: check:startup failed.");
      return startup;
    }
  }

  if (!options.skipChartPerf) {
    const chartPerf = deps.runChartPerfCheck();
    if (chartPerf !== 0) {
      console.error("Deploy blocked: chart perf budgets failed.");
      return chartPerf;
    }
  }

  if (!options.skipTypecheck) {
    const typecheck = deps.runTypecheckCheck();
    if (typecheck !== 0) {
      console.error("Deploy blocked: TypeScript typecheck failed.");
      return typecheck;
    }
  }

  const buildCode =
    deps.buildRuntimeAndMigrateImages?.(options.developmentRoot, targetSha) ??
    buildRuntimeAndMigrateImages(options.developmentRoot, targetSha, deps.buildDeps);
  if (buildCode !== 0) return buildCode;

  const inspectCode = validateImageFactsForDeploy(
    imageTag,
    options.developmentRoot,
    deps.buildDeps,
    deps,
  );
  if (inspectCode !== 0) return inspectCode;

  const targetDigest = readImageDigest(imageTag, deps.buildDeps.execFile);
  const preflightInput = loadContainerDeployInputSync(
    options.developmentRoot,
    deps,
    inspectImageFacts(imageTag, options.developmentRoot, deps.buildDeps),
  );
  const preflight = runContainerPreflightCheck(preflightInput);
  if (preflight !== 0) return preflight;

  const stopCode = await deps.stopServiceIfLoaded();
  if (stopCode !== 0) return stopCode;

  const infra = options.skipInfra ? 0 : deps.runInfraUp();
  if (infra !== 0) return infra;

  writeDeployRevisionState(
    options.developmentRoot,
    {
      ...deployState,
      pendingSha: targetSha,
      pendingDigest: targetDigest,
      failedSha: null,
      failedDigest: null,
    },
    deps,
  );

  const containerOpts = containerOptions(options.developmentRoot, imageTag, true);
  const migrateCode = deps.runContainerMigrate(containerOpts);
  if (migrateCode !== 0) {
    writeDeployRevisionState(
      options.developmentRoot,
      {
        ...deployState,
        pendingSha: targetSha,
        pendingDigest: targetDigest,
        failedSha: targetSha,
        failedDigest: targetDigest,
      },
      deps,
    );
    return migrateCode;
  }

  const startCode = deps.runContainerStart(containerOpts);
  if (startCode !== 0) {
    writeDeployRevisionState(
      options.developmentRoot,
      {
        ...deployState,
        pendingSha: targetSha,
        pendingDigest: targetDigest,
        failedSha: targetSha,
        failedDigest: targetDigest,
      },
      deps,
    );
    return startCode;
  }

  const dockerHealth = assertDockerContainerHealthy(deps.execFile);
  if (!dockerHealth.ok) {
    writeDeployRevisionState(
      options.developmentRoot,
      {
        currentSha: deployState.currentSha,
        currentDigest: deployState.currentDigest,
        previousSha: deployState.previousSha,
        previousDigest: deployState.previousDigest,
        pendingSha: null,
        pendingDigest: null,
        failedSha: targetSha,
        failedDigest: targetDigest,
        promotedAt: deployState.promotedAt,
        buildId: deployState.buildId,
      },
      deps,
    );
    console.error(
      `production.deploy=failed revision=${targetSha} health_gate=${dockerHealth.reason ?? "docker_unhealthy"}`,
    );
    console.error("Run: npm run local:prod:container:rollback");
    return 1;
  }

  const gate = await deps.runHealthGate(options.developmentRoot);
  const buildId = deps.readContainerBuildId();
  if (!gate.ok) {
    writeDeployRevisionState(
      options.developmentRoot,
      {
        currentSha: deployState.currentSha,
        currentDigest: deployState.currentDigest,
        previousSha: deployState.previousSha,
        previousDigest: deployState.previousDigest,
        pendingSha: null,
        pendingDigest: null,
        failedSha: targetSha,
        failedDigest: targetDigest,
        promotedAt: deployState.promotedAt,
        buildId: deployState.buildId,
      },
      deps,
    );
    console.error(
      `production.deploy=failed revision=${targetSha} health_gate=${gate.reasons.join(",") || "unknown"}`,
    );
    console.error("Run: npm run local:prod:container:rollback");
    return 1;
  }

  const nextState: LocalProdDeployRevisionState = {
    currentSha: targetSha,
    currentDigest: targetDigest,
    previousSha: deployState.currentSha ?? deployState.previousSha,
    previousDigest: deployState.currentDigest ?? deployState.previousDigest,
    pendingSha: null,
    pendingDigest: null,
    failedSha: null,
    failedDigest: null,
    promotedAt: new Date().toISOString(),
    buildId,
  };
  writeDeployRevisionState(options.developmentRoot, nextState, deps);
  pruneAfterPromotion(options.developmentRoot, nextState, deps);
  console.log(
    `production.deploy=pass revision=${targetSha} digest=${targetDigest ?? "missing"} buildId=${buildId ?? "missing"} health_gate=pass`,
  );
  return 0;
}

export async function runContainerRollbackCommand(
  options: DeployLocalProdContainerOptions,
  deps: DeployLocalProdContainerDeps = defaultDeployLocalProdContainerDeps(),
): Promise<number> {
  const deployState = readDeployRevisionState(options.developmentRoot, deps);
  const targetSha = deployState.previousSha;
  if (!targetSha) {
    console.error("Rollback blocked: no previous known-good revision recorded.");
    return 1;
  }

  const imageTag = imageTagForSha(targetSha);
  const ownershipError = assertDeployOwnershipAllowed(deps);
  if (ownershipError) {
    console.error(ownershipError);
    return 1;
  }

  const preflightInput = loadContainerDeployInputSync(options.developmentRoot, deps);
  const preflight = runContainerPreflightCheck(preflightInput);
  if (preflight !== 0) return preflight;

  if (!imageExists(imageTag, deps.execFile)) {
    const buildCode =
      deps.buildRuntimeAndMigrateImages?.(options.developmentRoot, targetSha) ??
      buildRuntimeAndMigrateImages(options.developmentRoot, targetSha, deps.buildDeps);
    if (buildCode !== 0) return buildCode;
  } else if (!imageExists(migrateImageTagForSha(targetSha), deps.execFile)) {
    const migrateBuild = runMigrateImageCommand(
      {
        command: "migrate-image",
        developmentRoot: options.developmentRoot,
        revision: targetSha,
        imageTag,
        dockerTarget: "migrate",
        skipWorktree: false,
      },
      deps.buildDeps,
    );
    if (migrateBuild !== 0) return migrateBuild;
  }

  const targetDigest =
    deployState.previousDigest ?? readImageDigest(imageTag, deps.buildDeps.execFile);

  const stopCode = await deps.stopServiceIfLoaded();
  if (stopCode !== 0) return stopCode;

  const infra = options.skipInfra ? 0 : deps.runInfraUp();
  if (infra !== 0) return infra;

  writeDeployRevisionState(
    options.developmentRoot,
    {
      ...deployState,
      pendingSha: targetSha,
      pendingDigest: targetDigest,
      failedSha: null,
      failedDigest: null,
    },
    deps,
  );

  const containerOpts = containerOptions(options.developmentRoot, imageTag, true);
  const migrateCode = deps.runContainerMigrate(containerOpts);
  if (migrateCode !== 0) return migrateCode;

  const startCode = deps.runContainerStart(containerOpts);
  if (startCode !== 0) return startCode;

  const dockerHealth = assertDockerContainerHealthy(deps.execFile);
  if (!dockerHealth.ok) {
    console.error(
      `production.rollback=failed revision=${targetSha} health_gate=${dockerHealth.reason ?? "docker_unhealthy"}`,
    );
    return 1;
  }

  const gate = await deps.runHealthGate(options.developmentRoot);
  const buildId = deps.readContainerBuildId();
  if (!gate.ok) {
    console.error(
      `production.rollback=failed revision=${targetSha} health_gate=${gate.reasons.join(",") || "unknown"}`,
    );
    return 1;
  }

  const nextState: LocalProdDeployRevisionState = {
    currentSha: targetSha,
    currentDigest: targetDigest,
    previousSha: null,
    previousDigest: null,
    pendingSha: null,
    pendingDigest: null,
    failedSha: null,
    failedDigest: null,
    promotedAt: new Date().toISOString(),
    buildId,
  };
  writeDeployRevisionState(options.developmentRoot, nextState, deps);
  pruneAfterPromotion(options.developmentRoot, nextState, deps);
  console.log(
    `production.rollback=pass revision=${targetSha} digest=${targetDigest ?? "missing"} buildId=${buildId ?? "missing"} health_gate=pass`,
  );
  return 0;
}

export async function runDeployLocalProdContainerCommand(
  options: DeployLocalProdContainerOptions,
  deps: DeployLocalProdContainerDeps = defaultDeployLocalProdContainerDeps(),
): Promise<number> {
  switch (options.command) {
    case "deploy":
      return runContainerDeployCommand(options, deps);
    case "rollback":
      return runContainerRollbackCommand(options, deps);
    default:
      return 2;
  }
}

export async function runDeployLocalProdContainerCli(
  argv: string[],
  cwd = process.cwd(),
  deps: DeployLocalProdContainerDeps = defaultDeployLocalProdContainerDeps(),
): Promise<number> {
  try {
    const options = parseDeployLocalProdContainerArgs(argv, cwd);
    return runDeployLocalProdContainerCommand(options, deps);
  } catch (error) {
    if (error instanceof ContainerDeployHelpRequestedError) {
      console.log(HELP_TEXT.trim());
      return 0;
    }
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    return 2;
  }
}

const isMain =
  typeof process.argv[1] === "string" &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  process.exitCode = await runDeployLocalProdContainerCli(process.argv.slice(2));
}
