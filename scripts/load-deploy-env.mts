import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "dotenv";

import {
  LOCAL_DEPLOY_CONTRACT,
  resolveContainerProductionEnvPath,
  type DeployProfile,
  type ProductionRuntimeMode,
} from "./validate-local-deploy.mts";

export function profileEnvFileName(profile: DeployProfile): string {
  return LOCAL_DEPLOY_CONTRACT[profile].envFileName;
}

export function resolveProfileEnvPath(
  root: string,
  profile: DeployProfile,
  options?: { runtimeMode?: ProductionRuntimeMode },
): string {
  if (profile === "production" && options?.runtimeMode === "container") {
    return resolveContainerProductionEnvPath(root);
  }
  return join(root, profileEnvFileName(profile));
}

export function readProfileEnvFile(
  root: string,
  profile: DeployProfile,
  options?: { runtimeMode?: ProductionRuntimeMode },
): Record<string, string> {
  const path = resolveProfileEnvPath(root, profile, options);
  if (!existsSync(path)) {
    return {};
  }
  return parse(readFileSync(path));
}

/** Load profile env into `process.env` (later keys override). Returns parsed values. */
export function loadProfileEnvIntoProcess(
  root: string,
  profile: DeployProfile,
  options?: { runtimeMode?: ProductionRuntimeMode },
): Record<string, string> {
  const path = resolveProfileEnvPath(root, profile, options);
  const values = readProfileEnvFile(root, profile, options);
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
  if (existsSync(path)) {
    process.env.NODE_ENV = profile === "production" ? "production" : process.env.NODE_ENV ?? "development";
  }
  return values;
}
