import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadProfileEnvIntoProcess,
  readProfileEnvFile,
  resolveProfileEnvPath,
} from "./load-deploy-env.mts";

describe("load-deploy-env", () => {
  it("resolves profile env paths from contract", () => {
    const root = "/tmp/checkout";
    expect(resolveProfileEnvPath(root, "development")).toBe(join(root, ".env.local"));
    expect(resolveProfileEnvPath(root, "production")).toBe(join(root, ".env.production.local"));
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
});
