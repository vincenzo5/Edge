/**
 * Unified script source resolution — library first, golden fixtures fallback.
 */

import { resolveScriptFixtureSource } from './scriptFixtureCatalog';

export type ResolvedScriptSource = {
  scriptId: string;
  revision: string;
  source: string;
  defaultInputs: Record<string, unknown>;
  displayName: string;
  pane: 'main' | 'sub';
  inputSchema?: import('./scriptContracts').ScriptInputSchema;
  manifest?: import('./scriptContracts').ScriptManifest;
};

export type ScriptSourceResolver = (
  scriptId: string,
  revision: string,
) => ResolvedScriptSource | null;

export function resolveScriptSource(
  scriptId: string,
  revision: string,
  resolver?: ScriptSourceResolver | null,
): ResolvedScriptSource | null {
  if (resolver) {
    const resolved = resolver(scriptId, revision);
    if (resolved) return resolved;
  }
  return resolveScriptFixtureSource(scriptId, revision);
}
