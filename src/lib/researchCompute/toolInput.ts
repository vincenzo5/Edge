import { MAX_TOOL_INPUT_JSON_BYTES } from "./constants";

/** Serialize and cap tool input for durable job records. */
export function normalizeToolInputForStorage(toolInput: unknown): unknown {
  const serialized = JSON.stringify(toolInput ?? {});
  if (Buffer.byteLength(serialized, "utf8") > MAX_TOOL_INPUT_JSON_BYTES) {
    throw new Error(`Tool input exceeds max bytes (${MAX_TOOL_INPUT_JSON_BYTES})`);
  }
  return JSON.parse(serialized) as unknown;
}
