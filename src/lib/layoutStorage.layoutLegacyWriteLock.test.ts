import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(process.cwd(), "src");
const LEGACY_LAYOUT_KEY = "tv-ai:layout:v1";

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
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) continue;
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry)) continue;
    files.push(fullPath);
  }
  return files;
}

describe("layout legacy write lock", () => {
  it("does not import saveLayout or clearLayout outside layoutStorage", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const rel = relative(SRC_ROOT, file);
      if (rel === "lib/layoutStorage.ts") continue;

      const source = readFileSync(file, "utf8");
      if (/\bsaveLayout\b/.test(source) || /\bclearLayout\b/.test(source)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not write tv-ai:layout:v1 outside layoutStorage", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const rel = relative(SRC_ROOT, file);
      if (rel === "lib/layoutStorage.ts") continue;

      const source = readFileSync(file, "utf8");
      if (
        source.includes(`setItem("${LEGACY_LAYOUT_KEY}"`) ||
        source.includes(`setItem('${LEGACY_LAYOUT_KEY}'`)
      ) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
