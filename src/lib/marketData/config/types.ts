/** Server-side configuration accessor for provider adapters (env today; vault later). */
export interface ConfigSource {
  /** Returns trimmed value or undefined when unset/empty. */
  get(key: string): string | undefined;
  /** True when get(key) returns a non-empty trimmed string. */
  isSet(key: string): boolean;
}
