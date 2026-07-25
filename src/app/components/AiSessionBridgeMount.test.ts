import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("AiSessionBridge mount contract", () => {
  it("DensityModuleLayout is the only production mount of AiSessionBridge", () => {
    const densitySource = readFileSync(
      path.join(repoRoot, "src/app/components/home/DensityModuleLayout.tsx"),
      "utf8",
    );
    expect(densitySource).toContain("AiSessionBridge");

    const copilotProvidersSource = readFileSync(
      path.join(repoRoot, "src/app/components/copilot/CopilotRuntimeProviders.tsx"),
      "utf8",
    );
    expect(copilotProvidersSource).not.toMatch(/<\s*AiSessionBridge/);
    expect(copilotProvidersSource).toContain("do not nest");

    const appProvidersSource = readFileSync(
      path.join(repoRoot, "src/app/components/stock-app/AppProviders.tsx"),
      "utf8",
    );
    expect(appProvidersSource).not.toMatch(/<\s*AiSessionBridge/);
    expect(appProvidersSource).toContain("not duplicated here");
  });
});
