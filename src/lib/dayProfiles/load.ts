import { readFileSync } from "node:fs";
import path from "node:path";

import { parseDayProfilesCsv } from "./parseCsv";
import { CONFIRMED_DAY_PROFILES_PATH, type DayProfile } from "./types";

export function resolveDayProfilesPath(rootDir = process.cwd()): string {
  return path.join(rootDir, CONFIRMED_DAY_PROFILES_PATH);
}

export function loadConfirmedDayProfiles(rootDir = process.cwd()): DayProfile[] {
  const filePath = resolveDayProfilesPath(rootDir);
  const content = readFileSync(filePath, "utf8");
  return parseDayProfilesCsv(content);
}
