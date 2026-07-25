#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { join, basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runDeployHealthGate } from "./deploy-health-gate.mts";
import { classifyMigrationChanges } from "./deploy-migration-policy.mts";
import { loadProfileEnvIntoProcess } from "./load-deploy-env.mts";
import {
  defaultLocalProdDeps,
  isLaunchAgentLoaded,
  loadDeployInputSync,
  parseLocalProdArgs,
  readBuildId,
  readDeployRevisionState,
  readWorktreeFacts,
  readWorktreeRevision,
  runBuildCommand,
  runMigrateCommand,
  runPreflightCheck,
  writeDeployRevisionState,
  type LocalProdDeps,
  type LocalProdDeployRevisionState,
  type LocalProdOptions,
} from "./local-prod.mts";
import { runLocalProdServiceCli } from "./local-prod-service.mts";
import { runLocalInfraUp } from "./local-data-infrastructure.mts";

export type DeployLocalProdCommand = "deploy" | "rollback";

export type DeployLocalProdOptions = LocalProdOptions & {
  command: DeployLocalProdCommand;
  skipStartup: boolean;
};

export type DeployLocalProdDeps = LocalProdDeps & {
  runStartupCheck: () => number;
  runInfraUp: () => number;
  runMigrate: (options: LocalProdOptions) => Promise<number>;
  runBuild: (options: LocalProdOptions) => Promise<number>;
  restartService: (options: LocalProdOptions) => Promise<number>;
  runHealthGate: (
    options: LocalProdOptions,
  ) => Promise<Awaited<ReturnType<typeof runDeployHealthGate>>>;
  readProductionBuildId: (options: LocalProdOptions) => string | null;
  stopServiceIfLoaded: () => Promise<number>;
};

const HELP_TEXT = `Local production deploy and rollback.

Commands:
  deploy     Promote a Git revision to production (requires --revision)
  rollback   Restore the previous known-good production revision

Options:
  --revision <sha|tag>  Required for deploy
  --dev-root <path>     Development checkout (default: cwd)
  --prod-root <path>    Production worktree override
  --dev-env <path>      Development env file override
  --prod-env <path>     Production env file override
  --skip-infra          Skip docker compose up before migrate
  --skip-startup        Skip npm run check:startup gate

Examples:
  npm run local:prod:deploy -- --revision HEAD
  npm run local:prod:rollback
`;

export class DeployHelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "DeployHelpRequestedError";
  }
}

function defaultProductionRoot(developmentRoot: string): string {
  return resolve(developmentRoot, "..", `${basename(developmentRoot)}-production`);
}

export function parseDeployLocalProdArgs(
  argv: string[],
  cwd = process.cwd(),
): DeployLocalProdOptions {
  const args = [...argv];
  const knownCommands: DeployLocalProdCommand[] = ["deploy", "rollback"];
  let command: DeployLocalProdCommand | null = null;
  if (args[0] && knownCommands.includes(args[0] as DeployLocalProdCommand)) {
    command = args.shift() as DeployLocalProdCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new DeployHelpRequestedError();
    }
    throw new Error("Missing command. Use: deploy | rollback");
  }

  let skipStartup = false;
  const filtered: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new DeployHelpRequestedError();
    }
    if (flag === "--skip-startup") {
      skipStartup = true;
      continue;
    }
    filtered.push(flag);
  }

  const base = parseLocalProdArgs(["status", ...filtered], cwd);
  return {
    ...base,
    command,
    skipStartup,
  };
}

export function resolveGitRevision(
  developmentRoot: string,
  ref: string,
  execFile: LocalProdDeps["execFile"],
): string {
  return execFile("git", ["-C", developmentRoot, "rev-parse", ref]);
}

export function promoteProductionWorktree(
  options: LocalProdOptions,
  targetSha: string,
  deps: Pick<LocalProdDeps, "execFile" | "existsSync" | "mkdirSync">,
): number {
  const facts = readWorktreeFacts(options.productionRoot, deps.execFile);
  if (facts.exists && facts.isGitWorktree && !facts.clean) {
    console.error("Production worktree is dirty. Commit or reset before deploy.");
    return 1;
  }

  if (!deps.existsSync(options.productionRoot)) {
    deps.mkdirSync(resolve(options.productionRoot, ".."), { recursive: true });
    deps.execFile(
      "git",
      ["worktree", "add", "--detach", options.productionRoot, targetSha],
      { cwd: options.developmentRoot },
    );
    return 0;
  }

  const current = readWorktreeRevision(options.productionRoot, deps.execFile);
  if (current === targetSha && facts.detached) {
    console.log(`production.worktree=unchanged revision=${targetSha}`);
    return 0;
  }

  try {
    deps.execFile("git", ["-C", options.productionRoot, "fetch", "--all", "--prune"], {
      cwd: options.developmentRoot,
    });
  } catch {
    // best effort — local refs may already include targetSha
  }
  deps.execFile(
    "git",
    ["-C", options.productionRoot, "checkout", "--detach", targetSha],
    { cwd: options.developmentRoot },
  );
  console.log(`production.worktree=promoted revision=${targetSha}`);
  return 0;
}

async function stopLaunchdIfLoaded(deps: LocalProdDeps): Promise<number> {
  if (!isLaunchAgentLoaded(deps)) return 0;
  return runLocalProdServiceCli(["stop"], process.cwd());
}

async function restartLaunchdService(
  options: LocalProdOptions,
  deps: Pick<LocalProdDeps, "existsSync">,
): Promise<number> {
  const installed = deps.existsSync(
    join(
      process.env.HOME ?? "",
      "Library",
      "LaunchAgents",
      "com.edge.local-prod.plist",
    ),
  );
  if (installed) {
    return runLocalProdServiceCli(
      [
        "restart",
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
  console.error("LaunchAgent is not installed. Run: npm run local:prod:service:install");
  return 1;
}

export function defaultDeployLocalProdDeps(): DeployLocalProdDeps {
  const base = defaultLocalProdDeps();
  return {
    ...base,
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
    runInfraUp: () => {
      try {
        return runLocalInfraUp();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        return 1;
      }
    },
    runMigrate: (options) => runMigrateCommand(options, base),
    runBuild: (options) => runBuildCommand(options, base),
    restartService: async (options) => restartLaunchdService(options, base),
    runHealthGate: async (options) => {
      loadProfileEnvIntoProcess(options.productionRoot, "production");
      const apiKey = process.env.EDGE_API_KEY?.trim() ?? null;
      return runDeployHealthGate({
        apiKey,
        fetchImpl: base.fetchImpl,
        sleep: base.sleep,
      });
    },
    readProductionBuildId: (options) => readBuildId(options.productionRoot, base),
    stopServiceIfLoaded: async () => stopLaunchdIfLoaded(base),
  };
}

export async function runDeployCommand(
  options: DeployLocalProdOptions,
  deps: DeployLocalProdDeps = defaultDeployLocalProdDeps(),
): Promise<number> {
  if (!options.revision) {
    console.error("Error: --revision is required for deploy.");
    console.error("  npm run local:prod:deploy -- --revision <sha|tag>");
    return 2;
  }

  const targetSha = resolveGitRevision(options.developmentRoot, options.revision, deps.execFile);
  const input = loadDeployInputSync(options, deps);
  const preflight = runPreflightCheck(input);
  if (preflight !== 0) return preflight;

  const facts = readWorktreeFacts(options.productionRoot, deps.execFile);
  if (facts.exists && facts.isGitWorktree && !facts.clean) {
    console.error("Production worktree is dirty. Resolve before deploy.");
    return 1;
  }

  const deployState = readDeployRevisionState(options.developmentRoot, deps);
  const fromSha =
    deployState.currentSha ?? readWorktreeRevision(options.productionRoot, deps.execFile);
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

  if (!options.skipStartup) {
    const startup = deps.runStartupCheck();
    if (startup !== 0) {
      console.error("Deploy blocked: check:startup failed.");
      return startup;
    }
  }

  const stopCode = await deps.stopServiceIfLoaded();
  if (stopCode !== 0) return stopCode;

  const promoteCode = promoteProductionWorktree(options, targetSha, deps);
  if (promoteCode !== 0) return promoteCode;

  const infra = options.skipInfra ? 0 : deps.runInfraUp();
  if (infra !== 0) return infra;

  const migrateCode = await deps.runMigrate(options);
  if (migrateCode !== 0) return migrateCode;

  const buildCode = await deps.runBuild(options);
  if (buildCode !== 0) return buildCode;

  writeDeployRevisionState(
    options.developmentRoot,
    {
      ...deployState,
      pendingSha: targetSha,
      failedSha: null,
    },
    deps,
  );

  const restartCode = await deps.restartService(options);
  if (restartCode !== 0) {
    writeDeployRevisionState(
      options.developmentRoot,
      {
        ...deployState,
        pendingSha: targetSha,
        failedSha: targetSha,
      },
      deps,
    );
    return restartCode;
  }

  const gate = await deps.runHealthGate(options);
  const buildId = deps.readProductionBuildId(options);
  if (!gate.ok) {
    writeDeployRevisionState(
      options.developmentRoot,
      {
        currentSha: deployState.currentSha,
        previousSha: deployState.previousSha,
        pendingSha: null,
        failedSha: targetSha,
        promotedAt: deployState.promotedAt,
        buildId: deployState.buildId,
      },
      deps,
    );
    console.error(
      `production.deploy=failed revision=${targetSha} health_gate=${gate.reasons.join(",") || "unknown"}`,
    );
    console.error("Run: npm run local:prod:rollback");
    return 1;
  }

  const nextState: LocalProdDeployRevisionState = {
    currentSha: targetSha,
    previousSha: deployState.currentSha ?? deployState.previousSha,
    pendingSha: null,
    failedSha: null,
    promotedAt: new Date().toISOString(),
    buildId,
  };
  writeDeployRevisionState(options.developmentRoot, nextState, deps);
  console.log(
    `production.deploy=pass revision=${targetSha} buildId=${buildId ?? "missing"} health_gate=pass`,
  );
  return 0;
}

export async function runRollbackCommand(
  options: DeployLocalProdOptions,
  deps: DeployLocalProdDeps = defaultDeployLocalProdDeps(),
): Promise<number> {
  const input = loadDeployInputSync(options, deps);
  const preflight = runPreflightCheck(input);
  if (preflight !== 0) return preflight;

  const deployState = readDeployRevisionState(options.developmentRoot, deps);
  const targetSha = deployState.previousSha;
  if (!targetSha) {
    console.error("Rollback blocked: no previous known-good revision recorded.");
    return 1;
  }

  const stopCode = await deps.stopServiceIfLoaded();
  if (stopCode !== 0) return stopCode;

  const promoteCode = promoteProductionWorktree(options, targetSha, deps);
  if (promoteCode !== 0) return promoteCode;

  const buildCode = await deps.runBuild(options);
  if (buildCode !== 0) return buildCode;

  const infra = options.skipInfra ? 0 : deps.runInfraUp();
  if (infra !== 0) return infra;

  const migrateCode = await deps.runMigrate({ ...options, skipInfra: true });
  if (migrateCode !== 0) return migrateCode;

  writeDeployRevisionState(
    options.developmentRoot,
    {
      ...deployState,
      pendingSha: targetSha,
      failedSha: null,
    },
    deps,
  );

  const restartCode = await deps.restartService(options);
  if (restartCode !== 0) return restartCode;

  const gate = await deps.runHealthGate(options);
  const buildId = deps.readProductionBuildId(options);
  if (!gate.ok) {
    console.error(
      `production.rollback=failed revision=${targetSha} health_gate=${gate.reasons.join(",") || "unknown"}`,
    );
    return 1;
  }

  writeDeployRevisionState(
    options.developmentRoot,
    {
      currentSha: targetSha,
      previousSha: null,
      pendingSha: null,
      failedSha: null,
      promotedAt: new Date().toISOString(),
      buildId,
    },
    deps,
  );
  console.log(
    `production.rollback=pass revision=${targetSha} buildId=${buildId ?? "missing"} health_gate=pass`,
  );
  return 0;
}

export async function runDeployLocalProdCommand(
  options: DeployLocalProdOptions,
  deps: DeployLocalProdDeps = defaultDeployLocalProdDeps(),
): Promise<number> {
  switch (options.command) {
    case "deploy":
      return runDeployCommand(options, deps);
    case "rollback":
      return runRollbackCommand(options, deps);
    default:
      return 2;
  }
}

export async function runDeployLocalProdCli(
  argv: string[],
  cwd = process.cwd(),
  deps?: DeployLocalProdDeps,
): Promise<number> {
  try {
    const options = parseDeployLocalProdArgs(argv, cwd);
    return runDeployLocalProdCommand(options, deps ?? defaultDeployLocalProdDeps());
  } catch (error) {
    if (error instanceof DeployHelpRequestedError) {
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
  process.exitCode = await runDeployLocalProdCli(process.argv.slice(2));
}
