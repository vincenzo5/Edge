/**
 * Phase 2 in-memory resolver: maps stable scriptId + revision to golden fixture source.
 * Source lives only here — not in workspace payloads (Phase 3 library owns persistence).
 */

import { SCRIPT_FIXTURES, type ScriptFixtureId } from './scriptFixtures';

export const GOLDEN_SCRIPT_FIXTURE_REVISION = 'golden-v1';

export type GoldenScriptFixtureId =
  | 'line-midpoint'
  | 'histogram-macd-style'
  | 'hline-rsi-style'
  | 'band-boll-style'
  | 'plot-marker-signal'
  | 'plot-bgcolor-band'
  | 'plot-style-stepline';

export const GOLDEN_SCRIPT_FIXTURE_IDS: GoldenScriptFixtureId[] = [
  'line-midpoint',
  'histogram-macd-style',
  'hline-rsi-style',
  'band-boll-style',
  'plot-marker-signal',
  'plot-bgcolor-band',
  'plot-style-stepline',
];

export type ResolvedScriptFixtureSource = {
  scriptId: GoldenScriptFixtureId;
  revision: string;
  source: string;
  defaultInputs: Record<string, unknown>;
  displayName: string;
  pane: 'main' | 'sub';
};

export function isGoldenScriptFixtureId(scriptId: string): scriptId is GoldenScriptFixtureId {
  return (GOLDEN_SCRIPT_FIXTURE_IDS as string[]).includes(scriptId);
}

export function resolveScriptFixtureSource(
  scriptId: string,
  revision: string,
): ResolvedScriptFixtureSource | null {
  if (revision !== GOLDEN_SCRIPT_FIXTURE_REVISION) return null;
  if (!isGoldenScriptFixtureId(scriptId)) return null;
  const fixture = SCRIPT_FIXTURES[scriptId as ScriptFixtureId];
  if (!fixture?.expectCompileOk) return null;
  const pane =
    scriptId === 'histogram-macd-style' ||
    scriptId === 'hline-rsi-style' ||
    scriptId === 'plot-marker-signal' ||
    scriptId === 'plot-bgcolor-band'
      ? 'sub'
      : 'main';
  return {
    scriptId,
    revision,
    source: fixture.source,
    defaultInputs: fixture.defaultInputs ?? {},
    displayName: fixture.description,
    pane,
  };
}

export function scriptInstanceNameForFixture(scriptId: GoldenScriptFixtureId): string {
  return `__script_${scriptId.replace(/-/g, '_')}`;
}
