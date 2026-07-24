import ts from 'typescript';
import type { ScriptCompileResult, ScriptDiagnostic, ScriptManifest } from '@edge/chart-core';
import {
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_SDK_VERSION,
  validateScriptManifest,
  type ScriptRuntimeBudgets,
} from '@edge/chart-core';
import { FORBIDDEN_SOURCE_PATTERNS } from './guestGlobals.js';
import {
  hashExecutableArtifact,
  hashNormalizedScriptSource,
  normalizeScriptSource,
} from './sourceNormalize.js';

const SCRIPT_FILE = 'script.ts';
const SDK_PREAMBLE = `
interface ReadonlyArray<T> { readonly length: number; readonly [n: number]: T; }
interface Array<T> extends ReadonlyArray<T> {
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  fill(value: T, start?: number, end?: number): this;
}
interface ArrayConstructor {
  isArray(arg: unknown): arg is unknown[];
}
declare var Array: ArrayConstructor;
type EdgeScriptPane = 'main' | 'sub';
type EdgeScriptInputDef = { kind: string; label?: string; default?: unknown; min?: number; max?: number };
type EdgeScriptPlotDef = {
  kind: string;
  title: string;
  color?: string;
  lineWidth?: number;
  hlineAt?: number;
  fillBetween?: string;
  fillColor?: string;
  style?: string;
  shape?: string;
  location?: string;
  size?: number;
  opacity?: number;
  colorRules?: Array<{ when: string; value?: number; color: string }>;
};
type EdgeScriptCandle = { t: number; o: number; h: number; l: number; c: number; v: number };
type EdgeScriptTa = {
  sma: (values: (number | null)[], period: number) => (number | null)[];
  ema: (values: (number | null)[], period: number) => (number | null)[];
  wma: (values: (number | null)[], period: number) => (number | null)[];
  vwma: (candles: EdgeScriptCandle[], period: number) => (number | null)[];
  stddev: (
    values: (number | null)[],
    period: number,
    mean?: (number | null)[],
  ) => (number | null)[];
  rsi: (closes: (number | null)[], period: number) => (number | null)[];
  highest: (values: (number | null)[], period: number) => (number | null)[];
  lowest: (values: (number | null)[], period: number) => (number | null)[];
  roc: (closes: (number | null)[], period: number) => (number | null)[];
  change: (series: (number | null)[], length?: number) => (number | null)[];
  percentChange: (series: (number | null)[], length?: number) => (number | null)[];
  crossover: (a: (number | null)[], b: (number | null)[]) => (number | null)[];
  crossunder: (a: (number | null)[], b: (number | null)[]) => (number | null)[];
  macd: (
    closes: (number | null)[],
    fast?: number,
    slow?: number,
    signalPeriod?: number,
  ) => { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };
  stoch: (
    candles: EdgeScriptCandle[],
    kPeriod?: number,
    dPeriod?: number,
  ) => { k: (number | null)[]; d: (number | null)[] };
  bollinger: (
    closes: (number | null)[],
    period?: number,
    mult?: number,
  ) => { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] };
  cci: (candles: EdgeScriptCandle[], period?: number) => (number | null)[];
  obv: (candles: EdgeScriptCandle[]) => (number | null)[];
  dmi: (
    candles: EdgeScriptCandle[],
    diPeriod?: number,
    adxSmoothing?: number,
  ) => { plusDi: (number | null)[]; minusDi: (number | null)[]; adx: (number | null)[] };
  atr: (candles: EdgeScriptCandle[], period: number) => (number | null)[];
  source: (candles: EdgeScriptCandle[], priceSource: string) => (number | null)[];
};
type EdgeScriptSeriesRequest = { symbol?: string; interval?: string };
type EdgeScriptRequest = {
  series: (request?: EdgeScriptSeriesRequest) => EdgeScriptCandle[];
};
type EdgeScriptBoxObject = {
  kind: 'box';
  leftBar: number;
  rightBar: number;
  top: number;
  bottom: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
};
type EdgeScriptLabelObject = {
  kind: 'label';
  bar: number;
  price: number;
  text: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
};
type EdgeScriptLevelObject = {
  kind: 'level';
  price: number;
  leftBar?: number;
  rightBar?: number;
  color?: string;
  lineWidth?: number;
};
type EdgeScriptObjectDef = EdgeScriptBoxObject | EdgeScriptLabelObject | EdgeScriptLevelObject;
type EdgeScriptCalculateResult = {
  objects?: { [key: string]: EdgeScriptObjectDef };
  [key: string]: (number | null)[] | { [key: string]: EdgeScriptObjectDef } | undefined;
};
type EdgeScriptManifest = {
  name: string;
  pane: EdgeScriptPane;
  inputs: { [key: string]: EdgeScriptInputDef };
  calculate(
    candles: EdgeScriptCandle[],
    inputs: { [key: string]: unknown },
    ta: EdgeScriptTa,
    request?: EdgeScriptRequest,
  ): EdgeScriptCalculateResult;
  plots: { [key: string]: EdgeScriptPlotDef };
  alerts?: { [key: string]: { title: string; seriesId: string } };
};
`;

/** @deprecated Use hashNormalizedScriptSource or hashExecutableArtifact */
export function hashArtifact(source: string): string {
  return hashExecutableArtifact(source);
}

/** Ensure transpiled script returns the manifest object when evaluated. */
export function normalizeExecutableArtifact(artifact: string): string {
  const trimmed = artifact.trim();
  if (/return\s+edgeScript\(\);\s*$/.test(trimmed)) {
    return trimmed;
  }
  if (/edgeScript\(\);\s*$/.test(trimmed)) {
    return trimmed.replace(/edgeScript\(\);\s*$/, 'return edgeScript();');
  }
  if (!/\breturn\b/.test(trimmed)) {
    return `${trimmed}\nreturn undefined;`;
  }
  return trimmed;
}

export function evaluateArtifactManifest(artifact: string): ScriptManifest | undefined {
  try {
    const normalized = normalizeExecutableArtifact(artifact);
    // eslint-disable-next-line no-new-func
    const fn = new Function(`
      "use strict";
      ${normalized}
    `);
    const manifest = fn() as unknown;
    return validateScriptManifest(manifest) ? manifest : undefined;
  } catch {
    return undefined;
  }
}

function toDiagnostic(d: ts.Diagnostic, lineOffset = 0): ScriptDiagnostic {
  let line = 1;
  let column = 1;
  if (d.file && d.start != null) {
    const pos = d.file.getLineAndCharacterOfPosition(d.start);
    line = pos.line + 1 - lineOffset;
    column = pos.character + 1;
  }
  return {
    line: Math.max(1, line),
    column: Math.max(1, column),
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    severity: d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
  };
}

function stripForbiddenConstructs(source: string): ScriptDiagnostic[] {
  const diagnostics: ScriptDiagnostic[] = [];
  for (const { pattern, message } of FORBIDDEN_SOURCE_PATTERNS) {
    const match = source.match(pattern);
    if (match && match.index != null) {
      const before = source.slice(0, match.index);
      const line = before.split('\n').length;
      const column = (before.split('\n').pop()?.length ?? 0) + 1;
      diagnostics.push({ line, column, message, severity: 'error' });
    }
  }
  return diagnostics;
}

function sdkLineOffset(): number {
  return SDK_PREAMBLE.split('\n').length;
}

function typecheckSource(source: string): ScriptDiagnostic[] {
  const combined = `${SDK_PREAMBLE}\n${source}`;
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
    strict: false,
    noEmit: true,
    noLib: true,
    skipLibCheck: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    ignoreDeprecations: '6.0',
  };
  const host: ts.CompilerHost = {
    getSourceFile: (fileName, languageVersion) => {
      if (fileName === SCRIPT_FILE) {
        return ts.createSourceFile(fileName, combined, languageVersion, true);
      }
      return undefined;
    },
    writeFile: () => {},
    getDefaultLibFileName: () => 'lib.d.ts',
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => '/',
    getNewLine: () => '\n',
    fileExists: (fileName) => fileName === SCRIPT_FILE,
    readFile: (fileName) => (fileName === SCRIPT_FILE ? combined : undefined),
  };

  const program = ts.createProgram([SCRIPT_FILE], compilerOptions, host);

  const offset = sdkLineOffset();
  return program
    .getSemanticDiagnostics()
    .concat(program.getSyntacticDiagnostics())
    .filter((d) => d.file?.fileName === SCRIPT_FILE)
    .map((d) => toDiagnostic(d, offset));
}

function compileBudgetExceeded(startMs: number, maxCompileMs: number): boolean {
  return Date.now() - startMs > maxCompileMs;
}

export function compileScriptSource(
  source: string,
  budgets: Pick<ScriptRuntimeBudgets, 'maxSourceBytes' | 'maxCompileMs'>,
): ScriptCompileResult {
  const startMs = Date.now();
  const normalizedSource = normalizeScriptSource(source);
  const diagnostics: ScriptDiagnostic[] = [];
  const versionFields = {
    languageVersion: SCRIPT_LANGUAGE_VERSION,
    sdkVersion: SCRIPT_SDK_VERSION,
  };

  if (normalizedSource.length > budgets.maxSourceBytes) {
    return {
      ok: false,
      diagnostics: [
        {
          line: 1,
          column: 1,
          message: `Source exceeds ${budgets.maxSourceBytes} bytes`,
          severity: 'error',
        },
      ],
      ...versionFields,
    };
  }

  diagnostics.push(...stripForbiddenConstructs(normalizedSource));
  if (diagnostics.some((d) => d.severity === 'error')) {
    return { ok: false, diagnostics, ...versionFields };
  }

  if (compileBudgetExceeded(startMs, budgets.maxCompileMs)) {
    return {
      ok: false,
      diagnostics: [{ line: 1, column: 1, message: 'Compile timeout exceeded', severity: 'error' }],
      ...versionFields,
    };
  }

  diagnostics.push(...typecheckSource(normalizedSource));
  const typeErrors = diagnostics.filter((d) => d.severity === 'error');
  if (typeErrors.length > 0) {
    return { ok: false, diagnostics, ...versionFields };
  }

  if (compileBudgetExceeded(startMs, budgets.maxCompileMs)) {
    return {
      ok: false,
      diagnostics: [{ line: 1, column: 1, message: 'Compile timeout exceeded', severity: 'error' }],
      ...versionFields,
    };
  }

  const transpiled = ts.transpileModule(normalizedSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      strict: true,
      noEmitOnError: true,
      ignoreDeprecations: '6.0',
    },
    reportDiagnostics: true,
  });

  for (const d of transpiled.diagnostics ?? []) {
    diagnostics.push(toDiagnostic(d));
  }

  const errors = diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    return { ok: false, diagnostics, ...versionFields };
  }

  if (compileBudgetExceeded(startMs, budgets.maxCompileMs)) {
    return {
      ok: false,
      diagnostics: [{ line: 1, column: 1, message: 'Compile timeout exceeded', severity: 'error' }],
      ...versionFields,
    };
  }

  const artifact = normalizeExecutableArtifact(transpiled.outputText.trim());
  const artifactHash = hashNormalizedScriptSource(normalizedSource);

  return {
    ok: true,
    diagnostics,
    artifact,
    artifactHash,
    ...versionFields,
  };
}

/** Extract manifest by executing artifact in a trusted host context (compile-time validation only). */
export function extractManifestFromArtifact(artifact: string): ScriptManifest | undefined {
  return evaluateArtifactManifest(artifact);
}

export function compileScript(source: string, budgets: ScriptRuntimeBudgets): ScriptCompileResult {
  const result = compileScriptSource(source, budgets);
  if (!result.ok || !result.artifact) return result;
  const manifest = extractManifestFromArtifact(result.artifact);
  if (!manifest) {
    return {
      ok: false,
      diagnostics: [
        {
          line: 1,
          column: 1,
          message: 'Script must return a valid indicator manifest from edgeScript()',
          severity: 'error',
        },
      ],
      languageVersion: SCRIPT_LANGUAGE_VERSION,
      sdkVersion: SCRIPT_SDK_VERSION,
    };
  }
  return { ...result, manifest };
}
