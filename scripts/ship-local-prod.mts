#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runDeployLocalProdContainerCli } from "./deploy-local-prod-container.mts";
import { runLocalProdContainerCli } from "./local-prod-container.mts";

export type ShipLocalProdOptions = {
  developmentRoot: string;
};

export type ShipLocalProdGitFacts = {
  clean: boolean;
  branch: string | null;
};

export type ShipLocalProdDeps = {
  execFile: (file: string, args: string[]) => string;
  runCiLocal: () => number;
  runGitPush: () => number;
  runContainerDeploy: () => Promise<number>;
  runContainerStatus: () => Promise<number>;
};

const HELP_TEXT = `Ship local Docker production from a clean main checkout.

Runs: ci:local → git push → container deploy (HEAD) → container status.

Requirements:
  - Branch must be main
  - Worktree must be clean (commit or stash first)

Examples:
  npm run local:prod:ship
`;

export class ShipLocalProdHelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "ShipLocalProdHelpRequestedError";
  }
}

export function parseShipLocalProdArgs(
  argv: string[],
  cwd = process.cwd(),
): ShipLocalProdOptions {
  const args = [...argv];
  let developmentRoot = resolve(cwd);

  if (args.includes("--help") || args.includes("-h")) {
    throw new ShipLocalProdHelpRequestedError();
  }

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--dev-root") {
      if (!value || value.startsWith("--")) {
        throw new Error("--dev-root requires a value");
      }
      developmentRoot = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${flag}`);
  }

  return { developmentRoot };
}

export function readDevelopmentGitFacts(
  developmentRoot: string,
  execFile: ShipLocalProdDeps["execFile"],
): ShipLocalProdGitFacts {
  try {
    const status = execFile("git", ["-C", developmentRoot, "status", "--porcelain"]);
    const branch = execFile("git", [
      "-C",
      developmentRoot,
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]).trim();
    return { clean: status.trim() === "", branch };
  } catch {
    return { clean: false, branch: null };
  }
}

export function defaultShipLocalProdDeps(
  developmentRoot: string,
): ShipLocalProdDeps {
  return {
    execFile: (file, args) =>
      execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
    runCiLocal: () => {
      try {
        execFileSync("npm", ["run", "ci:local"], {
          cwd: developmentRoot,
          stdio: "inherit",
          env: process.env,
        });
        return 0;
      } catch {
        return 1;
      }
    },
    runGitPush: () => {
      try {
        execFileSync("git", ["push", "-u", "origin", "HEAD"], {
          cwd: developmentRoot,
          stdio: "inherit",
          env: process.env,
        });
        return 0;
      } catch {
        return 1;
      }
    },
    runContainerDeploy: () =>
      runDeployLocalProdContainerCli(["deploy", "--revision", "HEAD"], developmentRoot),
    runContainerStatus: () =>
      runLocalProdContainerCli(["status"], developmentRoot),
  };
}

export async function runShipLocalProdCommand(
  options: ShipLocalProdOptions,
  deps: ShipLocalProdDeps = defaultShipLocalProdDeps(options.developmentRoot),
): Promise<number> {
  const facts = readDevelopmentGitFacts(options.developmentRoot, deps.execFile);

  if (!facts.clean) {
    console.error("Ship stopped at: git_clean");
    console.error("Development worktree is dirty. Commit or stash before ship.");
    return 1;
  }

  if (facts.branch !== "main") {
    console.error("Ship stopped at: git_branch");
    console.error(`Ship requires branch main (current: ${facts.branch ?? "unknown"}).`);
    return 1;
  }

  const ci = deps.runCiLocal();
  if (ci !== 0) {
    console.error("Ship stopped at: ci_local");
    return ci;
  }

  const push = deps.runGitPush();
  if (push !== 0) {
    console.error("Ship stopped at: git_push");
    return push;
  }

  const deploy = await deps.runContainerDeploy();
  if (deploy !== 0) {
    console.error("Ship stopped at: container_deploy");
    return deploy;
  }

  const status = await deps.runContainerStatus();
  if (status !== 0) {
    console.error("Ship stopped at: container_status");
    return status;
  }

  console.log("Ship passed: revision=HEAD prod=http://127.0.0.1:3000");
  return 0;
}

export async function runShipLocalProdCli(
  argv: string[],
  cwd = process.cwd(),
  deps?: ShipLocalProdDeps,
): Promise<number> {
  try {
    const options = parseShipLocalProdArgs(argv, cwd);
    return runShipLocalProdCommand(
      options,
      deps ?? defaultShipLocalProdDeps(options.developmentRoot),
    );
  } catch (error) {
    if (error instanceof ShipLocalProdHelpRequestedError) {
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
  process.exitCode = await runShipLocalProdCli(process.argv.slice(2));
}
