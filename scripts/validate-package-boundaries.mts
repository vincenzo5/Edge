#!/usr/bin/env npx tsx
/**
 * Validates internal package boundaries:
 * - No imports from closed app code
 * - Allowed dependency policy per package
 * - Examples must not import closed app internals
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  closedAppImportIssues,
  extractImportSpecifiers,
  type BoundaryIssue,
} from "./package-boundary-policy.mts";

const ROOT = join(import.meta.dirname, "..");

type PackagePolicy = {
  name: string;
  srcDir: string;
  packageJson: string;
  allowedWorkspaceDeps: Set<string>;
};

const PACKAGE_POLICIES: PackagePolicy[] = [
  {
    name: "@edge/chart-core",
    srcDir: join(ROOT, "packages/chart-core/src"),
    packageJson: join(ROOT, "packages/chart-core/package.json"),
    allowedWorkspaceDeps: new Set<string>(),
  },
  {
    name: "@edge/chart-react",
    srcDir: join(ROOT, "packages/chart-react/src"),
    packageJson: join(ROOT, "packages/chart-react/package.json"),
    allowedWorkspaceDeps: new Set(["@edge/chart-core"]),
  },
  {
    name: "@edge/ai-tools-core",
    srcDir: join(ROOT, "packages/ai-tools-core/src"),
    packageJson: join(ROOT, "packages/ai-tools-core/package.json"),
    allowedWorkspaceDeps: new Set<string>(),
  },
  {
    name: "@edge/ai-tools-chart",
    srcDir: join(ROOT, "packages/ai-tools-chart/src"),
    packageJson: join(ROOT, "packages/ai-tools-chart/package.json"),
    allowedWorkspaceDeps: new Set(["@edge/ai-tools-core", "@edge/chart-core"]),
  },
];

const EXAMPLE_SCAN_DIRS = [
  join(ROOT, "examples/chart-core-basic/src"),
  join(ROOT, "examples/chart-react-basic/src"),
  join(ROOT, "examples/chart-plugins-basic/src"),
  join(ROOT, "examples/ai-tools-chart-basic/src"),
  join(ROOT, "examples/chart-data-source-basic/src"),
];

const SCAN_DIRS = [
  ...PACKAGE_POLICIES.map((p) => p.srcDir),
  ...EXAMPLE_SCAN_DIRS,
];

function readPackageManifest(path: string): {
  dependencies: Set<string>;
  peerDependencies: Set<string>;
  devDependencies: Set<string>;
} {
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return {
    dependencies: new Set(Object.keys(raw.dependencies ?? {})),
    peerDependencies: new Set(Object.keys(raw.peerDependencies ?? {})),
    devDependencies: new Set(Object.keys(raw.devDependencies ?? {})),
  };
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx|mts)$/.test(entry) && !/\.(test|spec)\.(ts|tsx|mts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function resolvePolicyForFile(file: string): PackagePolicy | null {
  for (const policy of PACKAGE_POLICIES) {
    if (file.startsWith(policy.srcDir)) return policy;
  }
  return null;
}

function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("/");
}

function isAllowedExternalDependency(
  manifest: ReturnType<typeof readPackageManifest>,
  specifier: string
): boolean {
  if (specifier.startsWith("node:")) return true;
  if (manifest.dependencies.has(specifier)) return true;
  if (manifest.peerDependencies.has(specifier)) return true;
  if (manifest.devDependencies.has(specifier)) return true;
  for (const dep of [...manifest.dependencies, ...manifest.peerDependencies]) {
    if (specifier === dep || specifier.startsWith(`${dep}/`)) return true;
  }
  return false;
}

function isAllowedWorkspaceImport(policy: PackagePolicy, specifier: string): boolean {
  if (!specifier.startsWith("@edge/")) return false;
  const pkgName = specifier.split("/").slice(0, 2).join("/");
  if (pkgName === policy.name) return true;
  return policy.allowedWorkspaceDeps.has(pkgName);
}

const issues: BoundaryIssue[] = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const content = readFileSync(file, "utf8");
    const relFile = relative(ROOT, file);
    issues.push(...closedAppImportIssues(relFile, content));

    const policy = resolvePolicyForFile(file);
    if (!policy) continue;
    const manifest = readPackageManifest(policy.packageJson);

    for (const { specifier, line } of extractImportSpecifiers(content)) {
      if (isRelativeImport(specifier)) continue;

      if (specifier.startsWith("@edge/") && !isAllowedWorkspaceImport(policy, specifier)) {
        issues.push({
          file: relFile,
          reason: `${policy.name} must not import workspace package "${specifier}"`,
          line,
        });
      } else if (
        !specifier.startsWith("@edge/") &&
        !isAllowedExternalDependency(manifest, specifier)
      ) {
        issues.push({
          file: relFile,
          reason: `${policy.name} imports undeclared dependency "${specifier}"`,
          line,
        });
      }
    }
  }
}

if (issues.length > 0) {
  console.error("Package boundary validation failed:\n");
  for (const issue of issues) {
    const loc = issue.line != null ? `${issue.file}:${issue.line}` : issue.file;
    console.error(`  ${loc} — ${issue.reason}`);
  }
  console.error(`\n${issues.length} issue(s).`);
  process.exit(1);
}

console.log("Package boundary validation passed.");
