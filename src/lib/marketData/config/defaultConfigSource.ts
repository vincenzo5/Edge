import { EnvConfigSource } from "./envConfigSource";
import type { ConfigSource } from "./types";

const envSource = new EnvConfigSource();
let override: ConfigSource | null = null;

export function getConfigSource(): ConfigSource {
  return override ?? envSource;
}

/** Test-only override; pass null to restore env default. */
export function setConfigSourceForTests(source: ConfigSource | null): void {
  override = source;
}
