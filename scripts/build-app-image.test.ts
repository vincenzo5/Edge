import { describe, expect, it, vi } from "vitest";

import {
  findForbiddenPathsInTarEntries,
  formatImageInspectSummary,
  imageTagForSha,
  isWorktreeClean,
  migrateImageTagForSha,
  parseBuildAppImageArgs,
  resolveRevisionSha,
  runBuildCommand,
  runInspectCommand,
  runMigrateImageCommand,
  type BuildAppImageDeps,
} from "./build-app-image.mts";
import { parseImageTagSha } from "./validate-local-deploy.mts";
import {
  LOCAL_CONTAINER_PRODUCTION_CONTRACT,
  validateContainerLocalDeploy,
  type ContainerLocalDeployInput,
} from "./validate-local-deploy.mts";

const FULL_SHA = "5aa83b921c51a7dadc625101076301ce765ac03d";
const DEV_ROOT = "/Users/example/TV AI";

function mockDeps(overrides: Partial<BuildAppImageDeps> = {}): BuildAppImageDeps {
  const execFile = vi.fn((file: string, args: string[]) => {
    if (file === "git" && args.includes("status")) return "";
    if (file === "git" && args.includes("rev-parse")) return FULL_SHA;
    if (file === "git" && args.includes("worktree")) return "";
    if (file === "docker" && args[0] === "inspect") {
      const formatIndex = args.indexOf("--format");
      const format = formatIndex >= 0 ? args[formatIndex + 1] : "";
      if (format.includes("org.opencontainers.image.revision")) return FULL_SHA;
      if (format.includes("Config.User")) return "edge";
    }
    if (file === "docker" && args[0] === "build") return "";
    return "";
  }) as BuildAppImageDeps["execFile"];

  return {
    execFile,
    execFileSync: vi.fn() as BuildAppImageDeps["execFileSync"],
    existsSync: vi.fn(() => true),
    mkdtempSync: vi.fn(() => "/tmp/edge-image-build-test"),
    rmSync: vi.fn(),
    ...overrides,
  };
}

describe("build-app-image contracts", () => {
  it("parses commands and options", () => {
    expect(parseBuildAppImageArgs(["build", "--revision", "HEAD"], DEV_ROOT)).toEqual({
      command: "build",
      developmentRoot: DEV_ROOT,
      revision: "HEAD",
      imageTag: null,
      dockerTarget: "runtime",
      skipWorktree: false,
    });
    expect(parseBuildAppImageArgs(["inspect", "--image", `edge-app:${FULL_SHA}`], DEV_ROOT)).toEqual({
      command: "inspect",
      developmentRoot: DEV_ROOT,
      revision: null,
      imageTag: `edge-app:${FULL_SHA}`,
      dockerTarget: "runtime",
      skipWorktree: false,
    });
  });

  it("derives image tags from full SHA", () => {
    expect(imageTagForSha(FULL_SHA)).toBe(`${LOCAL_CONTAINER_PRODUCTION_CONTRACT.imageNamePrefix}${FULL_SHA}`);
    expect(migrateImageTagForSha(FULL_SHA)).toBe(`edge-app:${FULL_SHA}-migrate`);
    expect(parseImageTagSha("edge-app:short")).toBeNull();
  });

  it("resolves revision to lowercase full SHA", () => {
    const deps = mockDeps();
    expect(resolveRevisionSha(DEV_ROOT, "HEAD", deps.execFile)).toBe(FULL_SHA);
  });

  it("detects dirty worktree", () => {
    const clean = mockDeps();
    expect(isWorktreeClean(DEV_ROOT, clean.execFile)).toBe(true);

    const dirty = mockDeps({
      execFile: vi.fn((file: string, args: string[]) => {
        if (file === "git" && args.includes("status")) return " M README.md";
        return "";
      }) as BuildAppImageDeps["execFile"],
    });
    expect(isWorktreeClean(DEV_ROOT, dirty.execFile)).toBe(false);
  });

  it("finds forbidden paths in tar entries", () => {
    const entries = [
      "blobs/sha256/abc",
      "app/server.js",
      "app/node_modules/pg/index.js",
      "app/.edge/local-prod/production.env",
    ];
    expect(findForbiddenPathsInTarEntries(entries)).toEqual(
      expect.arrayContaining(["node_modules", ".edge/local-prod/production.env"]),
    );
    expect(findForbiddenPathsInTarEntries(["app/server.js", "app/public/favicon.ico"])).toEqual([]);
  });

  it("formats inspect summary without secrets", () => {
    const output = formatImageInspectSummary(
      {
        imageTag: `edge-app:${FULL_SHA}`,
        buildContextClean: true,
        ociRevisionLabel: FULL_SHA,
        forbiddenPathsPresent: [],
      },
      "edge",
    ).join("\n");
    expect(output).toContain(`image.sha=${FULL_SHA}`);
    expect(output).not.toContain("EDGE_AUTH_SECRET");
    expect(output).not.toContain("postgres://");
  });
});

describe("build-app-image commands", () => {
  it("rejects build when worktree is dirty", () => {
    const deps = mockDeps({
      execFile: vi.fn((file: string, args: string[]) => {
        if (file === "git" && args.includes("status")) return " M Dockerfile";
        if (file === "git" && args.includes("rev-parse")) return FULL_SHA;
        return "";
      }) as BuildAppImageDeps["execFile"],
    });
    const code = runBuildCommand(
      {
        command: "build",
        developmentRoot: DEV_ROOT,
        revision: FULL_SHA,
        imageTag: null,
        dockerTarget: "runtime",
        skipWorktree: true,
      },
      deps,
    );
    expect(code).toBe(1);
  });

  it("builds runtime image from clean revision", () => {
    const deps = mockDeps();
    const code = runBuildCommand(
      {
        command: "build",
        developmentRoot: DEV_ROOT,
        revision: FULL_SHA,
        imageTag: null,
        dockerTarget: "runtime",
        skipWorktree: true,
      },
      deps,
    );
    expect(code).toBe(0);
    expect(deps.execFile).toHaveBeenCalledWith(
      "docker",
      expect.arrayContaining(["build", "--target", "runtime", "-t", `edge-app:${FULL_SHA}`]),
    );
  });

  it("rejects inspect for invalid image tag", () => {
    const code = runInspectCommand(
      {
        command: "inspect",
        developmentRoot: DEV_ROOT,
        revision: null,
        imageTag: "edge-app:short",
        dockerTarget: "runtime",
        skipWorktree: false,
      },
      mockDeps(),
    );
    expect(code).toBe(1);
  });

  it("passes inspect when OCI label matches and no forbidden paths", () => {
    const code = runInspectCommand(
      {
        command: "inspect",
        developmentRoot: DEV_ROOT,
        revision: null,
        imageTag: `edge-app:${FULL_SHA}`,
        dockerTarget: "runtime",
        skipWorktree: false,
      },
      mockDeps({
        listImageTarEntries: () => ["app/server.js", "app/public/favicon.ico"],
      }),
    );
    expect(code).toBe(0);
  });

  it("builds migrate image tag from runtime image reference", () => {
    const deps = mockDeps();
    const code = runMigrateImageCommand(
      {
        command: "migrate-image",
        developmentRoot: DEV_ROOT,
        revision: null,
        imageTag: `edge-app:${FULL_SHA}`,
        dockerTarget: "migrate",
        skipWorktree: true,
      },
      deps,
    );
    expect(code).toBe(0);
    expect(deps.execFile).toHaveBeenCalledWith(
      "docker",
      expect.arrayContaining(["--target", "migrate", "-t", `edge-app:${FULL_SHA}-migrate`]),
    );
  });
});

describe("validateContainerLocalDeploy image facts integration", () => {
  function validContainerInput(): ContainerLocalDeployInput {
    return {
      development: {
        EDGE_APP_HOST: "127.0.0.1",
        EDGE_APP_PORT: "3003",
        DATABASE_URL: "postgres://edge:dev-password@localhost:5432/edge_dev",
        EDGE_MARKET_DATA_CACHE_BACKEND: "redis",
        REDIS_URL: "redis://localhost:6379",
        EDGE_CACHE_ENV: "dev",
        EDGE_REQUIRE_REDIS: "0",
        EDGE_AUTH_SECRET: "dev-secret-abcdefghijklmnopqrstuvwxyz-123",
        EDGE_API_AUTH_MODE: "dev-open",
        EDGE_ALLOW_OPEN_DEV_SESSION: "1",
        TWS_ENABLED: "false",
      },
      production: {
        EDGE_APP_HOST: "127.0.0.1",
        EDGE_APP_PORT: "3000",
        DATABASE_URL: "postgres://edge:prod-password@postgres:5432/edge_prod",
        EDGE_MARKET_DATA_CACHE_BACKEND: "redis",
        REDIS_URL: "redis://redis:6379",
        EDGE_CACHE_ENV: "prod",
        EDGE_REQUIRE_REDIS: "1",
        EDGE_AUTH_SECRET: "prod-secret-abcdefghijklmnopqrstuvwxyz-456",
        EDGE_API_AUTH_MODE: "key",
        EDGE_API_KEY: "api-key-abcdefghijklmnopqrstuvwxyz-789",
        EDGE_ALLOW_OPEN_DEV_SESSION: "1",
        EDGE_READYZ_URL: "http://127.0.0.1:3000/readyz",
        TWS_ENABLED: "false",
        TWS_MANAGED: "external",
      },
      developmentRoot: DEV_ROOT,
      productionEnvPath: `${DEV_ROOT}/.edge/local-prod/production.env`,
      productionEnvFile: { exists: true, mode: 0o600 },
      portOwnership: {
        legacyLaunchAgentLoaded: false,
        containerBoundPort3000: false,
      },
      imageFacts: {
        imageTag: `edge-app:${FULL_SHA}`,
        buildContextClean: true,
        ociRevisionLabel: FULL_SHA,
        forbiddenPathsPresent: [],
      },
    };
  }

  it("surfaces image contract violations", () => {
    const input = validContainerInput();
    input.imageFacts = {
      imageTag: `edge-app:${FULL_SHA}`,
      buildContextClean: false,
      ociRevisionLabel: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      forbiddenPathsPresent: [".git", "node_modules"],
    };
    const codes = validateContainerLocalDeploy(input).map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "container.build_context_dirty",
        "container.oci_revision_mismatch",
        "container.forbidden_image_path",
      ]),
    );
  });
});
