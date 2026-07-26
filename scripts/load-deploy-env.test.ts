import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadProfileEnvIntoProcess,
  readProfileEnvFile,
  resolveProfileEnvPath,
} from "./load-deploy-env.mts";
import { resolveContainerProductionEnvPath } from "./validate-local-deploy.mts";

describe("load-deploy-env", () => {
  it("resolves profile env paths from contract", () => {
    const root = "/tmp/checkout";
    expect(resolveProfileEnvPath(root, "development")).toBe(join(root, ".env.local"));
    expect(resolveProfileEnvPath(root, "production")).toBe(join(root, ".env.production.local"));
  });

  it("resolves container production env outside the worktree", () => {
    const root = "/tmp/checkout";
    expect(resolveProfileEnvPath(root, "production", { runtimeMode: "container" })).toBe(
      resolveContainerProductionEnvPath(root),
    );
    expect(resolveContainerProductionEnvPath(root)).toBe(
      join(root, ".edge/local-prod/production.env"),
    );
  });

  it("loads production env into process.env", () => {
    const root = mkdtempSync(join(tmpdir(), "edge-load-env-"));
    writeFileSync(
      join(root, ".env.production.local"),
      "EDGE_APP_PORT=3000\nEDGE_CACHE_ENV=prod\n",
      "utf8",
    );
    const values = loadProfileEnvIntoProcess(root, "production");
    expect(values.EDGE_APP_PORT).toBe("3000");
    expect(process.env.EDGE_APP_PORT).toBe("3000");
    expect(readProfileEnvFile(root, "production").EDGE_CACHE_ENV).toBe("prod");
  });

  it("loads container production env from development checkout path", () => {
    const root = mkdtempSync(join(tmpdir(), "edge-load-env-container-"));
    const containerEnvPath = resolveContainerProductionEnvPath(root);
    mkdirSync(join(root, ".edge/local-prod"), { recursive: true });
    writeFileSync(containerEnvPath, "EDGE_APP_PORT=3000\nEDGE_CACHE_ENV=prod\n", "utf8");
    const values = readProfileEnvFile(root, "production", { runtimeMode: "container" });
    expect(values.EDGE_APP_PORT).toBe("3000");
    expect(resolveProfileEnvPath(root, "production", { runtimeMode: "container" })).toBe(
      containerEnvPath,
    );
  });
});
