import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const exampleRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(exampleRoot, "../..");
const chartCoreSrc = path.resolve(repoRoot, "packages/chart-core/src");
const chartReactSrc = path.resolve(repoRoot, "packages/chart-react/src");

function resolveChartCoreSubpath(subpath: string): string {
  const asFile = path.resolve(chartCoreSrc, subpath);
  if (existsSync(`${asFile}.ts`)) return `${asFile}.ts`;
  if (existsSync(`${asFile}.tsx`)) return `${asFile}.tsx`;
  const asIndex = path.resolve(chartCoreSrc, subpath, "index.ts");
  if (existsSync(asIndex)) return asIndex;
  return asFile;
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@edge\/chart-core\/(.+)$/,
        replacement: "$1",
        customResolver(source) {
          const subpath = source.replace(/^@edge\/chart-core\//, "");
          return resolveChartCoreSubpath(subpath);
        },
      },
      {
        find: "@edge/chart-core",
        replacement: path.resolve(chartCoreSrc, "index.ts"),
      },
      {
        find: "@edge/chart-react",
        replacement: path.resolve(chartReactSrc, "index.ts"),
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.tsx"],
  },
});
