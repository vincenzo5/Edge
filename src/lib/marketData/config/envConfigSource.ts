import type { ConfigSource } from "./types";

function trimValue(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export class EnvConfigSource implements ConfigSource {
  get(key: string): string | undefined {
    return trimValue(process.env[key]);
  }

  isSet(key: string): boolean {
    return this.get(key) !== undefined;
  }
}
