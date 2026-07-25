import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "dotenv";

import { LOCAL_DEPLOY_CONTRACT, type DeployProfile } from "./validate-local-deploy.mts";

export function profileEnvFileName(profile: DeployProfile): string {
  return LOCAL_DEPLOY_CONTRACT[profile].envFileName;
}

export function resolveProfileEnvPath(root: string, profile: DeployProfile): string {
  return join(root, profileEnvFileName(profile));
}

export function readProfileEnvFile(root: string, profile: DeployProfile): Record<string, string> {
  const path = resolveProfileEnvPath(root, profile);
  if (!existsSync(path)) {
    return {};
  }
  return parse(readFileSync(path));
}

/** Load profile env into `process.env` (later keys override). Returns parsed values. */
export function loadProfileEnvIntoProcess(root: string, profile: DeployProfile): Record<string, string> {
  const path = resolveProfileEnvPath(root, profile);
  const values = readProfileEnvFile(root, profile);
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
  if (existsSync(path)) {
    process.env.NODE_ENV = profile === "production" ? "production" : process.env.NODE_ENV ?? "development";
  }
  return values;
}
