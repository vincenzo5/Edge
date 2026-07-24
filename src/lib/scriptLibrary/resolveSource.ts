import type { ResolvedScriptSource } from "@edge/chart-core";
import { defaultInputsFromSchema } from "@/lib/chart/indicatorInputs";
import type { IndicatorPlugin } from "@/lib/chart/plugin-api";
import type { ScriptLibraryState } from "./types";
import { getRevisionSource, getScript } from "./repository";

export function resolveScriptLibrarySource(
  state: ScriptLibraryState,
  scriptId: string,
  revision: string,
): ResolvedScriptSource | null {
  const entry = getScript(state, scriptId);
  if (!entry) return null;

  const revisionRecord = getRevisionSource(state, scriptId, revision);
  if (!revisionRecord) return null;

  const pane = revisionRecord.manifest?.pane ?? "main";

  const defaultInputs =
    revisionRecord.manifest
      ? (defaultInputsFromSchema({
          inputSchema: revisionRecord.manifest.inputs,
        } as IndicatorPlugin) ?? {})
      : {};

  return {
    scriptId,
    revision,
    source: revisionRecord.source,
    defaultInputs,
    displayName: revisionRecord.manifest?.name ?? entry.displayName,
    pane,
    inputSchema: revisionRecord.manifest?.inputs,
    manifest: revisionRecord.manifest,
  };
}

export function createScriptSourceResolver(state: ScriptLibraryState) {
  return (scriptId: string, revision: string) =>
    resolveScriptLibrarySource(state, scriptId, revision);
}
