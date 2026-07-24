/**
 * Ownership split for the in-app agent track.
 * Agent orchestrates; the tool registry executes product mutations.
 */

export const AGENT_OWNS = [
  "orchestration loop",
  "system prompts and workspace snapshot injection",
  "model provider I/O (OpenRouter-first)",
  "chat wire format and stream events",
  "confirm-required envelopes before write/destructive execution",
] as const;

export const REGISTRY_OWNS = [
  "tool definitions and Zod input schemas",
  "JSON Schema export for model tool binding",
  "executeTool permission and confirmation gates",
  "server vs client-session execution split",
] as const;

export type AgentOwnership = (typeof AGENT_OWNS)[number];
export type RegistryOwnership = (typeof REGISTRY_OWNS)[number];
