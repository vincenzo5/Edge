import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_ROOT = join(process.cwd(), "src/app/components");
const FORBIDDEN_IMPORT = /@\/lib\/marketData\/providers\/tws/;

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("market data UI boundary", () => {
  it("does not import TWS provider internals from app components", () => {
    const offenders = collectSourceFiles(COMPONENTS_ROOT).filter((file) =>
      FORBIDDEN_IMPORT.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
