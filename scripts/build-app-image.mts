#!/usr/bin/env npx tsx

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  CONTAINER_FORBIDDEN_IMAGE_PATHS,
  LOCAL_CONTAINER_PRODUCTION_CONTRACT,
  parseImageTagSha,
  type ContainerImageFacts,
} from "./validate-local-deploy.mts";

export const IMAGE_MIGRATE_SUFFIX = "-migrate";

export type BuildAppImageCommand = "build" | "inspect" | "migrate-image";

export type BuildAppImageOptions = {
  command: BuildAppImageCommand;
  developmentRoot: string;
  revision: string | null;
  imageTag: string | null;
  dockerTarget: "runtime" | "migrate";
  skipWorktree: boolean;
};

export type BuildAppImageExec = (
  file: string,
  args: string[],
  options?: { cwd?: string; encoding?: BufferEncoding | null },
) => string | Buffer;

export type BuildAppImageDeps = {
  execFile: BuildAppImageExec;
  execFileSync: typeof execFileSync;
  existsSync: typeof existsSync;
  mkdtempSync: typeof mkdtempSync;
  rmSync: typeof rmSync;
  listImageTarEntries?: (imageTag: string) => string[];
};

const HELP_TEXT = `Production app image builder.

Commands:
  build          Build edge-app:<full-git-sha> runtime image from a clean revision
  inspect        Inspect runtime image identity and forbidden content
  migrate-image  Build edge-app:<full-git-sha>-migrate one-shot migration image

Options:
  --dev-root <path>   Development checkout (default: cwd)
  --revision <ref>    Git commit/tag/HEAD for build (required for build)
  --image <tag>       Image tag for inspect/migrate-image (required)
  --skip-worktree     Build from dev-root directly (testing only)

Examples:
  npm run image:build -- --revision HEAD
  npm run image:inspect -- --image edge-app:<sha>
  npm run image:migrate:build -- --image edge-app:<sha>
`;

export class HelpRequestedError extends Error {
  constructor() {
    super("help");
    this.name = "HelpRequestedError";
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

export function defaultBuildAppImageDeps(): BuildAppImageDeps {
  return {
    execFile: defaultExecFile,
    execFileSync,
    existsSync,
    mkdtempSync,
    rmSync,
  };
}

export function imageTagForSha(sha: string): string {
  return `${LOCAL_CONTAINER_PRODUCTION_CONTRACT.imageNamePrefix}${sha}`;
}

export function migrateImageTagForSha(sha: string): string {
  return `${imageTagForSha(sha)}${IMAGE_MIGRATE_SUFFIX}`;
}

export function parseBuildAppImageArgs(argv: string[], cwd = process.cwd()): BuildAppImageOptions {
  const args = [...argv];
  const knownCommands: BuildAppImageCommand[] = ["build", "inspect", "migrate-image"];
  let command: BuildAppImageCommand | null = null;
  if (args[0] && knownCommands.includes(args[0] as BuildAppImageCommand)) {
    command = args.shift() as BuildAppImageCommand;
  }
  if (!command) {
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      throw new HelpRequestedError();
    }
    throw new Error("Missing command. Use: build | inspect | migrate-image");
  }

  let developmentRoot = resolve(cwd);
  let revision: string | null = null;
  let imageTag: string | null = null;
  let skipWorktree = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      throw new HelpRequestedError();
    }
    if (flag === "--skip-worktree") {
      skipWorktree = true;
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
    } else if (flag === "--image") {
      imageTag = value;
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
    index += 1;
  }

  const dockerTarget = command === "migrate-image" ? "migrate" : "runtime";
  return {
    command,
    developmentRoot,
    revision,
    imageTag,
    dockerTarget,
    skipWorktree,
  };
}

export function resolveRevisionSha(
  developmentRoot: string,
  revision: string,
  execFile: BuildAppImageExec,
): string {
  const sha = execFile("git", ["-C", developmentRoot, "rev-parse", revision]).trim().toLowerCase();
  if (!LOCAL_CONTAINER_PRODUCTION_CONTRACT.fullGitShaPattern.test(sha)) {
    throw new Error("Resolved revision is not a full git SHA.");
  }
  return sha;
}

export function isWorktreeClean(developmentRoot: string, execFile: BuildAppImageExec): boolean {
  const status = execFile("git", ["-C", developmentRoot, "status", "--porcelain"]).trim();
  return status === "";
}

export function readOciRevisionLabel(
  imageTag: string,
  execFile: BuildAppImageExec,
): string | null {
  try {
    const label = execFile("docker", [
      "inspect",
      "--format",
      '{{ index .Config.Labels "org.opencontainers.image.revision" }}',
      imageTag,
    ]).trim();
    return label || null;
  } catch {
    return null;
  }
}

export function readDockerUser(imageTag: string, execFile: BuildAppImageExec): string | null {
  try {
    const user = execFile("docker", ["inspect", "--format", "{{ .Config.User }}", imageTag]).trim();
    return user || null;
  } catch {
    return null;
  }
}

function normalizeTarPath(entry: string): string {
  return entry.replace(/^\.?\//, "").replace(/\/+$/, "");
}

export function findForbiddenPathsInTarEntries(entries: readonly string[]): string[] {
  const normalizedEntries = entries.map(normalizeTarPath);
  const found = new Set<string>();
  for (const forbidden of CONTAINER_FORBIDDEN_IMAGE_PATHS) {
    const normalizedForbidden = normalizeTarPath(forbidden);
    for (const entry of normalizedEntries) {
      if (
        entry === normalizedForbidden ||
        entry.startsWith(`${normalizedForbidden}/`) ||
        entry.endsWith(`/${normalizedForbidden}`) ||
        entry.includes(`/${normalizedForbidden}/`)
      ) {
        found.add(forbidden);
        break;
      }
    }
  }
  return [...found].sort();
}

export function listImageTarEntries(imageTag: string): string[] {
  const saved = spawnSync("docker", ["save", imageTag], {
    encoding: "buffer",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (saved.status !== 0 || !saved.stdout) {
    throw new Error("Failed to export image archive for forbidden-path scan.");
  }
  const listed = spawnSync("tar", ["-tzf", "-"], {
    input: saved.stdout,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (listed.status !== 0 || listed.stdout == null) {
    throw new Error("Failed to list image archive entries.");
  }
  return listed.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function inspectImageFacts(
  imageTag: string,
  developmentRoot: string,
  deps: Pick<BuildAppImageDeps, "execFile" | "listImageTarEntries">,
): ContainerImageFacts {
  const sha = parseImageTagSha(imageTag);
  const ociRevisionLabel = readOciRevisionLabel(imageTag, deps.execFile);
  let forbiddenPathsPresent: string[] = [];
  const listEntries = deps.listImageTarEntries ?? listImageTarEntries;
  try {
    forbiddenPathsPresent = findForbiddenPathsInTarEntries(listEntries(imageTag));
  } catch {
    forbiddenPathsPresent = [...CONTAINER_FORBIDDEN_IMAGE_PATHS];
  }
  return {
    imageTag,
    buildContextClean: isWorktreeClean(developmentRoot, deps.execFile),
    ociRevisionLabel,
    forbiddenPathsPresent,
  };
}

export function formatImageInspectSummary(
  facts: ContainerImageFacts,
  user: string | null,
): string[] {
  const sha = facts.imageTag ? parseImageTagSha(facts.imageTag) : null;
  return [
    `image.tag=${facts.imageTag ?? "none"}`,
    `image.sha=${sha ?? "invalid"}`,
    `image.ociRevision=${facts.ociRevisionLabel ?? "none"}`,
    `image.buildContextClean=${facts.buildContextClean ? "true" : "false"}`,
    `image.forbiddenPaths=${facts.forbiddenPathsPresent?.join(",") || "none"}`,
    `image.user=${user ?? "unknown"}`,
  ];
}

function dockerBuildArgs(
  contextDir: string,
  sha: string,
  target: "runtime" | "migrate",
  tag: string,
): string[] {
  const created = new Date().toISOString();
  return [
    "build",
    "--target",
    target,
    "--label",
    `org.opencontainers.image.revision=${sha}`,
    "--label",
    `org.opencontainers.image.created=${created}`,
    "-t",
    tag,
    contextDir,
  ];
}

export function runBuildCommand(
  options: BuildAppImageOptions,
  deps: BuildAppImageDeps = defaultBuildAppImageDeps(),
): number {
  if (!options.revision) {
    console.error("Error: --revision is required for build.");
    return 2;
  }

  if (!options.skipWorktree && !isWorktreeClean(options.developmentRoot, deps.execFile)) {
    console.error("Production image build context must be clean at the selected revision.");
    return 1;
  }

  let sha: string;
  try {
    sha = resolveRevisionSha(options.developmentRoot, options.revision, deps.execFile);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid revision.");
    return 2;
  }

  let contextDir = options.developmentRoot;
  let tempWorktree: string | null = null;

  try {
    if (!options.skipWorktree) {
      tempWorktree = deps.mkdtempSync(join(tmpdir(), "edge-image-build-"));
      deps.execFile("git", [
        "-C",
        options.developmentRoot,
        "worktree",
        "add",
        "--detach",
        tempWorktree,
        sha,
      ]);
      contextDir = tempWorktree;
    }

    if (!deps.existsSync(join(contextDir, "Dockerfile"))) {
      console.error("Dockerfile is missing from build context.");
      return 1;
    }

    const tag =
      options.dockerTarget === "migrate" ? migrateImageTagForSha(sha) : imageTagForSha(sha);
    deps.execFile("docker", dockerBuildArgs(contextDir, sha, options.dockerTarget, tag));
    console.log(`image.build=pass tag=${tag} target=${options.dockerTarget} revision=${sha}`);
    return 0;
  } catch (error) {
    console.error("image.build=failed");
    console.error(error instanceof Error ? error.message : "Docker build failed.");
    return 1;
  } finally {
    if (tempWorktree) {
      try {
        deps.execFile("git", [
          "-C",
          options.developmentRoot,
          "worktree",
          "remove",
          "--force",
          tempWorktree,
        ]);
      } catch {
        deps.rmSync(tempWorktree, { recursive: true, force: true });
      }
    }
  }
}

export function runMigrateImageCommand(
  options: BuildAppImageOptions,
  deps: BuildAppImageDeps = defaultBuildAppImageDeps(),
): number {
  const tag = options.imageTag?.trim() ?? "";
  const sha = parseImageTagSha(tag);
  if (!sha) {
    console.error("Production image tag must be edge-app:<full-git-sha>.");
    return 2;
  }

  const code = runBuildCommand(
    {
      ...options,
      command: "build",
      revision: sha,
      dockerTarget: "migrate",
    },
    deps,
  );
  if (code !== 0) return code;

  console.log(`image.migrate=pass tag=${migrateImageTagForSha(sha)} revision=${sha}`);
  return 0;
}

export function runInspectCommand(
  options: BuildAppImageOptions,
  deps: BuildAppImageDeps = defaultBuildAppImageDeps(),
): number {
  const tag = options.imageTag?.trim() ?? "";
  if (!tag) {
    console.error("Error: --image is required for inspect.");
    return 2;
  }

  const sha = parseImageTagSha(tag);
  if (!sha) {
    console.error("Production image tag must be edge-app:<full-git-sha>.");
    return 1;
  }

  let facts: ContainerImageFacts;
  try {
    facts = inspectImageFacts(tag, options.developmentRoot, deps);
  } catch (error) {
    console.error("image.inspect=failed");
    console.error(error instanceof Error ? error.message : "Inspect failed.");
    return 1;
  }

  const user = readDockerUser(tag, deps.execFile);
  for (const line of formatImageInspectSummary(facts, user)) {
    console.log(line);
  }

  const issues: string[] = [];
  if (!facts.buildContextClean) {
    issues.push("build context dirty");
  }
  if (facts.ociRevisionLabel && facts.ociRevisionLabel.toLowerCase() !== sha) {
    issues.push("oci revision mismatch");
  }
  if ((facts.forbiddenPathsPresent?.length ?? 0) > 0) {
    issues.push("forbidden paths present");
  }
  if (user && user !== "edge") {
    issues.push("runtime user is not edge");
  }

  if (issues.length > 0) {
    console.error(`image.inspect=failed reasons=${issues.join(",")}`);
    return 1;
  }

  console.log("image.inspect=pass");
  return 0;
}

export function runBuildAppImageCommand(
  options: BuildAppImageOptions,
  deps: BuildAppImageDeps = defaultBuildAppImageDeps(),
): number {
  switch (options.command) {
    case "build":
      return runBuildCommand(options, deps);
    case "inspect":
      return runInspectCommand(options, deps);
    case "migrate-image":
      return runMigrateImageCommand(options, deps);
    default:
      return 2;
  }
}

export async function runBuildAppImageCli(
  argv: string[],
  cwd = process.cwd(),
  deps: BuildAppImageDeps = defaultBuildAppImageDeps(),
): Promise<number> {
  try {
    const options = parseBuildAppImageArgs(argv, cwd);
    return runBuildAppImageCommand(options, deps);
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
  process.exitCode = await runBuildAppImageCli(process.argv.slice(2));
}
