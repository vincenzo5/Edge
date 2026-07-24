import type { ConfigSource } from "./types";

function trimValue(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** In-memory config source for tests and future composition. */
export class MapConfigSource implements ConfigSource {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get(key: string): string | undefined {
    return trimValue(this.values[key]);
  }

  isSet(key: string): boolean {
    return this.get(key) !== undefined;
  }
}
