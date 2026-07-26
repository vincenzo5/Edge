#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { withComposeEnv } from "./compose-env.mts";
import {
  formatImageInspectSummary,
  imageTagForSha,
  inspectImageFacts,
  readDockerUser,
  readOciRevisionLabel,
  resolveRevisionSha,
  runBuildAppImageCommand,
  type BuildAppImageDeps,
  defaultBuildAppImageDeps,
} from "./build-app-image.mts";
import {
  inspectComposeAppService,
} from "./compose-app-service.mts";
import {
  formatComposeAppServiceSummary,
  formatLocalDeployIssues,
  CONTAINER_PRODUCTION_ENV_RELATIVE,
  LOCAL_CONTAINER_PRODUCTION_CONTRACT,
  parseImageTagSha,
  validateComposeAppService,
} from "./validate-local-deploy.mts";
import { runLocalInfraUp } from "./local-data-infrastructure.mts";
import {
  defaultLocalProdDeps,
  formatDeployRevisionStatus,
  isLaunchAgentLoaded,
  readDeployRevisionState,
} from "./local-prod.mts";
import { probeReadyz } from "../src/lib/observability/readyzProbe.ts";
import {
  APP_PROD_CONTAINER_NAME,
  assertContainerLifecycleAllowed,
  isLaunchAgentBlockingContainer,
  readContainerProductionFacts,
  readDockerServiceHealth,
  type PortOwnershipExec,
} from "./port-ownership.mts";

export type LocalProdContainerCommand =
  | "build"
  | "migrate"
  | "start"
  | "stop"
  | "restart"
  | "status"
  | "logs"
  | "inspect";

export type LocalProdContainerOptions = {
  command: LocalProdContainerCommand;
  developmentRoot: string;
  imageTag: string | null;
  revision: string | null;
  skipInfra: boolean;
  tailLines: number;
  skipWorktree: boolean;
};

export type LocalProdContainerExec = PortOwnershipExec;

export type LocalProdContainerDeps = {
  execFile: LocalProdContainerExec;
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  fetchImpl: typeof fetch;
  uid: number;
  listenPidsOnPort: (port: number) => number[];
  buildDeps: BuildAppImageDeps;
  spawnComposeInherit: (
    developmentRoot: string,
    args: string[],
    imageTag: string | null,
  ) => void;
  readComposeLogs: (
    developmentRoot: string,
    args: string[],
    imageTag: string | null,
  ) => string;
};

const HELP_TEXT = `Local production Docker lifecycle manager.

Commands:
  build      Build edge-app:<full-git-sha> runtime image (delegates to image:build)
  migrate    Run one-shot app-prod-migrate container for the selected image
  start      Start app-prod via Docker Compose (infra + ownership guard + health wait)
  stop       Stop app-prod container
  restart    Restart app-prod container
  status     Print redacted container/image/health/dependency status
  logs       Tail Docker logs for app-prod (secrets redacted)
  inspect    Inspect image identity and Compose app-prod contract

Options:
  --dev-root <path>     Development checkout (default: cwd)
  --image <tag>         edge-app:<full-git-sha> (required for migrate/start/restart/inspect)
  --revision <ref>      Git ref to resolve image tag (default: HEAD for build/start when --image omitted)
  --skip-infra          Skip postgres/redis compose up before start
  --skip-worktree       Build from dev-root directly (testing only; build command)
  --lines <n>           Log tail line count (default: 200)

Examples:
  npm run local:prod:container:build -- --revision HEAD
  npm run local:prod:container:start -- --image edge-app:<sha>
  npm run local:prod:container:status
  npm run local:prod:container:logs -- --lines 100
`;

export class ContainerHelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "ContainerHelpRequestedError";
  }
}

function defaultExecFile(
  file: string,
  args: string[],
  options?: { cwd?: string; encoding?: BufferEncoding | null },
): string {
  return execFileSync(file, args, {
    cwd: options?.cwd,
    encoding: (options?.encoding ?? "utf8") as BufferEncoding,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }) as string;
}

function defaultSpawnComposeInherit(
  developmentRoot: string,
  args: string[],
  imageTag: string | null,
): void {
  execFileSync("docker", ["compose", ...args], {
    cwd: developmentRoot,
    stdio: "inherit",
    env: imageTag ? composeEnv(imageTag) : withComposeEnv(),
  });
}

function defaultReadComposeLogs(
  developmentRoot: string,
  args: string[],
  imageTag: string | null,
): string {
  if (!imageTag) {
    throw new Error("EDGE_APP_IMAGE is required for compose logs when app-prod is not running.");
  }
  return execFileSync("docker", ["compose", ...args], {
    cwd: developmentRoot,
    encoding: "utf8",
    env: composeEnv(imageTag),
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }) as string;
}

export function defaultLocalProdContainerDeps(): LocalProdContainerDeps {
  const localProdDeps = defaultLocalProdDeps();
  return {
    execFile: defaultExecFile,
    existsSync,
    readFileSync,
    fetchImpl: fetch,
    uid: localProdDeps.uid,
    listenPidsOnPort: localProdDeps.listenPidsOnPort,
    buildDeps: defaultBuildAppImageDeps(),
    spawnComposeInherit: defaultSpawnComposeInherit,
    readComposeLogs: defaultReadComposeLogs,
  };
}

export function parseLocalProdContainerArgs(
  argv: string[],
  cwd = process.cwd(),
): LocalProdContainerOptions {
  const args = [...argv];
  const knownCommands: LocalProdContainerCommand[] = [
    "build",
    "migrate",
    "start",
    "stop",
    "restart",
    "status",
    "logs",
    "inspect",
  ];
  let command: LocalProdContainerCommand | null = null;
  if (args[0] && knownCommands.includes(args[0] as LocalProdContainerCommand)) {
    command = args.shift() as LocalProdContainerCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new ContainerHelpRequestedError();
    }
    throw new Error(
      "Missing command. Use: build | migrate | start | stop | restart | status | logs | inspect",
    );
  }

  let developmentRoot = resolve(cwd);
  let imageTag: string | null = null;
  let revision: string | null = null;
  let skipInfra = false;
  let skipWorktree = false;
  let tailLines = 200;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new ContainerHelpRequestedError();
    }
    if (flag === "--skip-infra") {
      skipInfra = true;
      continue;
    }
    if (flag === "--skip-worktree") {
      skipWorktree = true;
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
    } else if (flag === "--image") {
      imageTag = value.trim();
    } else if (flag === "--revision") {
      revision = value;
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
    index += 1;
  }

  return {
    command,
    developmentRoot,
    imageTag,
    revision,
    skipInfra,
    tailLines,
    skipWorktree,
  };
}

export function resolveContainerImageTag(
  options: Pick<LocalProdContainerOptions, "developmentRoot" | "imageTag" | "revision">,
  execFile: LocalProdContainerExec,
): string {
  const explicit = options.imageTag?.trim();
  if (explicit) {
    if (explicit.endsWith(":latest") || !parseImageTagSha(explicit)) {
      throw new Error("Production image tag must be edge-app:<full-git-sha>; latest is not allowed.");
    }
    return explicit;
  }

  const ref = options.revision?.trim() || "HEAD";
  const sha = resolveRevisionSha(options.developmentRoot, ref, execFile);
  return imageTagForSha(sha);
}

function productionEnvPath(developmentRoot: string): string {
  return join(developmentRoot, CONTAINER_PRODUCTION_ENV_RELATIVE);
}

export function assertProductionEnvReady(
  developmentRoot: string,
  deps: Pick<LocalProdContainerDeps, "existsSync">,
): string | null {
  const envPath = productionEnvPath(developmentRoot);
  if (!deps.existsSync(envPath)) {
    return `Production env file is missing: ${CONTAINER_PRODUCTION_ENV_RELATIVE}. Create it with mode 0600 before starting container production.`;
  }
  return null;
}

function composeEnv(imageTag: string): NodeJS.ProcessEnv {
  return withComposeEnv({
    ...process.env,
    EDGE_APP_IMAGE: imageTag,
  });
}

function execComposeSync(
  developmentRoot: string,
  args: string[],
  imageTag: string | null,
  deps: Pick<LocalProdContainerDeps, "execFile">,
): string {
  const resolvedImageTag =
    imageTag ?? readContainerProductionFacts(deps.execFile).imageTag;
  if (!resolvedImageTag) {
    throw new Error("EDGE_APP_IMAGE is required for compose logs when app-prod is not running.");
  }
  return execFileSync("docker", ["compose", ...args], {
    cwd: developmentRoot,
    encoding: "utf8",
    env: composeEnv(resolvedImageTag),
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }) as string;
}

function invokeSpawnComposeInherit(
  developmentRoot: string,
  args: string[],
  imageTag: string | null,
  deps: Pick<LocalProdContainerDeps, "spawnComposeInherit">,
): void {
  deps.spawnComposeInherit(developmentRoot, args, imageTag);
}

function readComposeLogs(
  developmentRoot: string,
  args: string[],
  imageTag: string | null,
  deps: Pick<LocalProdContainerDeps, "execFile" | "readComposeLogs">,
): string {
  const resolvedImageTag = imageTag ?? readContainerProductionFacts(deps.execFile).imageTag;
  if (!resolvedImageTag) {
    throw new Error("EDGE_APP_IMAGE is required for compose logs when app-prod is not running.");
  }
  return deps.readComposeLogs(developmentRoot, args, resolvedImageTag);
}

export function redactLogLine(line: string): string | null {
  if (/EDGE_API_KEY|EDGE_AUTH_SECRET|postgres:\/\/[^@]+@|DATABASE_URL=/i.test(line)) {
    return "[redacted line omitted]";
  }
  return line;
}

export async function probeHealthz(
  host = LOCAL_CONTAINER_PRODUCTION_CONTRACT.host,
  port = LOCAL_CONTAINER_PRODUCTION_CONTRACT.port,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; httpStatus?: number }> {
  const url = `http://${host}:${port}/healthz`;
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return { ok: false, httpStatus: response.status };
    }
    const body = (await response.json()) as { ok?: unknown };
    return { ok: body.ok === true, httpStatus: response.status };
  } catch {
    return { ok: false };
  }
}

export function formatContainerStatusSummary(input: {
  container: ReturnType<typeof readContainerProductionFacts>;
  imageSha: string | null;
  ociRevision: string | null;
  healthzOk: boolean | null;
  readyzOk: boolean | null;
  readyzReasons: string[];
  postgresHealth: string | null;
  redisHealth: string | null;
  deployLines: string[];
}): string[] {
  const lines = [
    `container.name=${APP_PROD_CONTAINER_NAME}`,
    `container.present=${input.container.present ? "yes" : "no"}`,
    `container.state=${input.container.status ?? "none"}`,
    `container.health=${input.container.health ?? "none"}`,
    `container.image=${input.container.imageTag ?? "none"}`,
    `container.sha=${input.imageSha ?? "none"}`,
    `container.ociRevision=${input.ociRevision ?? "none"}`,
    `container.healthz=${input.healthzOk == null ? "skipped" : input.healthzOk ? "pass" : "fail"}`,
    `container.readyz=${input.readyzOk == null ? "skipped" : input.readyzOk ? "pass" : "fail"}`,
    `container.readyzReasons=${input.readyzReasons.join(",") || "none"}`,
    `deps.postgres=${input.postgresHealth ?? "unknown"}`,
    `deps.redis=${input.redisHealth ?? "unknown"}`,
  ];
  return [...lines, ...input.deployLines];
}

export function runBuildCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): number {
  const revision = options.revision?.trim() || "HEAD";
  return runBuildAppImageCommand(
    {
      command: "build",
      developmentRoot: options.developmentRoot,
      revision,
      imageTag: null,
      dockerTarget: "runtime",
      skipWorktree: options.skipWorktree,
    },
    deps.buildDeps,
  );
}

export function runMigrateCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): number {
  let imageTag: string;
  try {
    imageTag = resolveContainerImageTag(options, deps.execFile);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid image tag.");
    return 2;
  }

  const envError = assertProductionEnvReady(options.developmentRoot, deps);
  if (envError) {
    console.error(envError);
    return 1;
  }

  if (!options.skipInfra) {
    try {
      runLocalInfraUp(options.developmentRoot);
    } catch (error) {
      console.error("container.migrate=failed reason=infra");
      console.error(error instanceof Error ? error.message : "Infrastructure start failed.");
      return 1;
    }
  }

  try {
    invokeSpawnComposeInherit(
      options.developmentRoot,
      ["--profile", "migrate", "run", "--rm", "app-prod-migrate"],
      imageTag,
      deps,
    );
    console.log(`container.migrate=pass image=${imageTag}`);
    return 0;
  } catch (error) {
    console.error("container.migrate=failed");
    console.error(error instanceof Error ? error.message : "Migration container failed.");
    return 1;
  }
}

export function runStartCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): number {
  let imageTag: string;
  try {
    imageTag = resolveContainerImageTag(options, deps.execFile);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid image tag.");
    return 2;
  }

  const envError = assertProductionEnvReady(options.developmentRoot, deps);
  if (envError) {
    console.error(envError);
    return 1;
  }

  const ownershipError = assertContainerLifecycleAllowed({
    execFile: deps.execFile,
    listenPidsOnPort: deps.listenPidsOnPort,
    isLaunchAgentLoaded: () =>
      isLaunchAgentLoaded({ execFile: deps.execFile, uid: deps.uid }),
    launchAgentBlocksContainer: () =>
      isLaunchAgentBlockingContainer(deps.execFile, deps.uid),
  });
  if (ownershipError) {
    console.error(ownershipError);
    return 1;
  }

  if (!options.skipInfra) {
    try {
      runLocalInfraUp(options.developmentRoot);
    } catch (error) {
      console.error("container.start=failed reason=infra");
      console.error(error instanceof Error ? error.message : "Infrastructure start failed.");
      return 1;
    }
  }

  try {
    invokeSpawnComposeInherit(
      options.developmentRoot,
      ["--profile", "prod", "up", "-d", "--wait", "app-prod"],
      imageTag,
      deps,
    );
    console.log(`container.start=pass image=${imageTag}`);
    return 0;
  } catch (error) {
    console.error("container.start=failed");
    console.error(error instanceof Error ? error.message : "Compose start failed.");
    return 1;
  }
}

export function runStopCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): number {
  const container = readContainerProductionFacts(deps.execFile);
  if (!container.present || container.status === "exited" || !container.running) {
    console.log("container.stop=noop reason=not-running");
    return 0;
  }

  try {
    invokeSpawnComposeInherit(options.developmentRoot, ["--profile", "prod", "stop", "app-prod"], null, deps);
    console.log("container.stop=pass");
    return 0;
  } catch (error) {
    console.error("container.stop=failed");
    console.error(error instanceof Error ? error.message : "Compose stop failed.");
    return 1;
  }
}

export function runRestartCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): number {
  const ownershipError = assertContainerLifecycleAllowed({
    execFile: deps.execFile,
    listenPidsOnPort: deps.listenPidsOnPort,
    isLaunchAgentLoaded: () =>
      isLaunchAgentLoaded({ execFile: deps.execFile, uid: deps.uid }),
    launchAgentBlocksContainer: () =>
      isLaunchAgentBlockingContainer(deps.execFile, deps.uid),
  });
  if (ownershipError) {
    console.error(ownershipError);
    return 1;
  }

  let imageTag: string | null = null;
  try {
    imageTag = resolveContainerImageTag(options, deps.execFile);
  } catch {
    imageTag = readContainerProductionFacts(deps.execFile).imageTag;
  }

  try {
    invokeSpawnComposeInherit(
      options.developmentRoot,
      ["--profile", "prod", "restart", "app-prod"],
      imageTag,
      deps,
    );
    invokeSpawnComposeInherit(
      options.developmentRoot,
      ["--profile", "prod", "up", "-d", "--wait", "app-prod"],
      imageTag,
      deps,
    );
    console.log(`container.restart=pass image=${imageTag ?? "unknown"}`);
    return 0;
  } catch (error) {
    console.error("container.restart=failed");
    console.error(error instanceof Error ? error.message : "Compose restart failed.");
    return 1;
  }
}

export async function runStatusCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): Promise<number> {
  const container = readContainerProductionFacts(deps.execFile);
  const imageTag = container.imageTag ?? options.imageTag;
  const imageSha = imageTag ? parseImageTagSha(imageTag) : null;
  const ociRevision = imageTag ? readOciRevisionLabel(imageTag, deps.execFile) : null;

  let healthzOk: boolean | null = null;
  let readyzOk: boolean | null = null;
  let readyzReasons: string[] = [];
  if (container.running) {
    const healthz = await probeHealthz(undefined, undefined, deps.fetchImpl);
    healthzOk = healthz.ok;
    const host = LOCAL_CONTAINER_PRODUCTION_CONTRACT.host;
    const port = LOCAL_CONTAINER_PRODUCTION_CONTRACT.port;
    const ready = await probeReadyz(`http://${host}:${port}/readyz`, deps.fetchImpl);
    readyzOk = ready.ok;
    readyzReasons = ready.reasons;
  }

  const postgresHealth = readDockerServiceHealth(deps.execFile, "edge-postgres");
  const redisHealth = readDockerServiceHealth(deps.execFile, "edge-redis");
  const deployState = readDeployRevisionState(options.developmentRoot, deps);
  const deployLines = formatDeployRevisionStatus(deployState);

  for (const line of formatContainerStatusSummary({
    container,
    imageSha,
    ociRevision,
    healthzOk,
    readyzOk,
    readyzReasons,
    postgresHealth,
    redisHealth,
    deployLines,
  })) {
    console.log(line);
  }

  if (container.running && healthzOk === false) {
    return 1;
  }
  return 0;
}

export function runLogsCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): number {
  let output: string;
  try {
    output = readComposeLogs(
      options.developmentRoot,
      ["--profile", "prod", "logs", "--tail", String(options.tailLines), "app-prod"],
      options.imageTag,
      deps,
    );
  } catch (error) {
    console.error("container.logs=failed");
    console.error(error instanceof Error ? error.message : "Compose logs failed.");
    return 1;
  }

  const lines = output.split("\n");
  if (lines.every((line) => line.length === 0)) {
    console.log("container.logs=empty");
    return 0;
  }

  console.log(`--- ${APP_PROD_CONTAINER_NAME} (last ${options.tailLines} lines) ---`);
  for (const line of lines) {
    if (line.length === 0) continue;
    const redacted = redactLogLine(line);
    console.log(redacted ?? line);
  }
  return 0;
}

export function runInspectCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): number {
  let imageTag: string;
  try {
    imageTag = resolveContainerImageTag(options, deps.execFile);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid image tag.");
    return 2;
  }

  let facts;
  try {
    facts = inspectImageFacts(imageTag, options.developmentRoot, deps.buildDeps);
  } catch (error) {
    console.error("container.inspect=failed reason=image");
    console.error(error instanceof Error ? error.message : "Image inspect failed.");
    return 1;
  }

  const user = readDockerUser(imageTag, deps.execFile);
  for (const line of formatImageInspectSummary(facts, user)) {
    console.log(line);
  }

  let composeFacts;
  try {
    composeFacts = inspectComposeAppService(options.developmentRoot, deps.execFile, {
      EDGE_APP_IMAGE: imageTag,
    });
  } catch (error) {
    console.error("container.inspect=failed reason=compose");
    console.error(error instanceof Error ? error.message : "Compose inspect failed.");
    return 1;
  }

  for (const line of formatComposeAppServiceSummary(composeFacts)) {
    console.log(line);
  }

  const issues = validateComposeAppService(composeFacts);
  if (issues.length > 0) {
    console.error(`container.inspect=failed composeIssues=${issues.length}`);
    for (const line of formatLocalDeployIssues(issues)) {
      console.error(`- ${line}`);
    }
    return 1;
  }

  const container = readContainerProductionFacts(deps.execFile);
  console.log(`container.runtime.state=${container.status ?? "none"}`);
  console.log(`container.runtime.health=${container.health ?? "none"}`);
  console.log("container.inspect=pass");
  return 0;
}

export async function runLocalProdContainerCommand(
  options: LocalProdContainerOptions,
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): Promise<number> {
  switch (options.command) {
    case "build":
      return runBuildCommand(options, deps);
    case "migrate":
      return runMigrateCommand(options, deps);
    case "start":
      return runStartCommand(options, deps);
    case "stop":
      return runStopCommand(options, deps);
    case "restart":
      return runRestartCommand(options, deps);
    case "status":
      return runStatusCommand(options, deps);
    case "logs":
      return runLogsCommand(options, deps);
    case "inspect":
      return runInspectCommand(options, deps);
    default:
      return 2;
  }
}

export async function runLocalProdContainerCli(
  argv: string[],
  cwd = process.cwd(),
  deps: LocalProdContainerDeps = defaultLocalProdContainerDeps(),
): Promise<number> {
  try {
    const options = parseLocalProdContainerArgs(argv, cwd);
    return runLocalProdContainerCommand(options, deps);
  } catch (error) {
    if (error instanceof ContainerHelpRequestedError) {
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
  process.exitCode = await runLocalProdContainerCli(process.argv.slice(2));
}
