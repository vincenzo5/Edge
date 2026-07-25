import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DESTRUCTIVE_PATTERNS = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bDROP\s+SCHEMA\b/i,
  /\bDROP\s+INDEX\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\s+TABLE\b[^;]*\bDROP\b/i,
] as const;

export type MigrationPolicyResult =
  | { ok: true; changedFiles: string[] }
  | { ok: false; reason: "destructive"; files: string[]; patterns: string[] }
  | { ok: false; reason: "git_diff_failed"; message: string };

export function scanSqlForDestructivePatterns(sql: string): string[] {
  const matched: string[] = [];
  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(sql)) {
      matched.push(pattern.source);
    }
  }
  return matched;
}

export function listMigrationFiles(migrationsDir: string): string[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export function classifyMigrationChanges(
  execFile: (file: string, args: string[], options?: { cwd?: string }) => string,
  repoRoot: string,
  fromSha: string | null,
  toSha: string,
): MigrationPolicyResult {
  const migrationsDir = "src/db/migrations";
  let diffOutput = "";
  try {
    if (fromSha && fromSha !== toSha) {
      diffOutput = execFile(
        "git",
        ["diff", "--name-only", `${fromSha}..${toSha}`, "--", migrationsDir],
        { cwd: repoRoot },
      );
    } else if (!fromSha) {
      diffOutput = listMigrationFiles(join(repoRoot, migrationsDir)).join("\n");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "git_diff_failed", message };
  }

  const changedFiles = diffOutput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".sql"));

  const destructiveFiles: string[] = [];
  const patterns: string[] = [];

  for (const relativePath of changedFiles) {
    const fullPath = join(repoRoot, relativePath);
    let sql = "";
    try {
      sql = readFileSync(fullPath, "utf8");
    } catch {
      try {
        sql = execFile("git", ["show", `${toSha}:${relativePath}`], { cwd: repoRoot });
      } catch {
        continue;
      }
    }
    const matched = scanSqlForDestructivePatterns(sql);
    if (matched.length > 0) {
      destructiveFiles.push(relativePath);
      for (const pattern of matched) {
        if (!patterns.includes(pattern)) patterns.push(pattern);
      }
    }
  }

  if (destructiveFiles.length > 0) {
    return { ok: false, reason: "destructive", files: destructiveFiles, patterns };
  }

  return { ok: true, changedFiles };
}
