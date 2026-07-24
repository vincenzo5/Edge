import { describe, expect, it } from 'vitest';
import { compileScript } from './compileScript.js';
import { compileScriptService as compileFacade } from './compilerService.js';
import {
  hashNormalizedScriptSource,
  normalizeScriptSource,
} from './sourceNormalize.js';
import { SCRIPT_FIXTURES, makeSyntheticCandles } from '@edge/chart-core';
import { DEFAULT_SCRIPT_RUNTIME_BUDGETS, SCRIPT_LANGUAGE_VERSION, SCRIPT_SDK_VERSION } from '@edge/chart-core';

describe('sourceNormalize', () => {
  it('normalizes BOM and CRLF deterministically', () => {
    const raw = '\uFEFFfunction edgeScript() {}\r\nedgeScript();\r\n';
    const once = normalizeScriptSource(raw);
    const twice = normalizeScriptSource(once);
    expect(once).toBe(twice);
    expect(once).not.toContain('\r');
  });

  it('hashes normalized source with version pairing', () => {
    const source = normalizeScriptSource(SCRIPT_FIXTURES['line-midpoint'].source);
    const a = hashNormalizedScriptSource(source);
    const b = hashNormalizedScriptSource(source);
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });
});

describe('compileScript', () => {
  it('compiles valid line fixture with version fields', () => {
    const fixture = SCRIPT_FIXTURES['line-midpoint'];
    const result = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(result.ok).toBe(true);
    expect(result.artifact).toBeTruthy();
    expect(result.manifest?.name).toBe('Midpoint');
    expect(result.languageVersion).toBe(SCRIPT_LANGUAGE_VERSION);
    expect(result.sdkVersion).toBe(SCRIPT_SDK_VERSION);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });

  it('reports syntax errors with line/column', () => {
    const fixture = SCRIPT_FIXTURES['syntax-error'];
    const result = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics[0]?.line).toBeGreaterThan(0);
  });

  it('reports real type errors from checker', () => {
    const fixture = SCRIPT_FIXTURES['type-error'];
    const result = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('string'))).toBe(true);
  });

  it('rejects static imports via fixture', () => {
    const result = compileScript(SCRIPT_FIXTURES['import-rejected'].source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('Imports'))).toBe(true);
  });

  it('rejects dynamic imports', () => {
    const result = compileScript(SCRIPT_FIXTURES['dynamic-import-rejected'].source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('Dynamic imports'))).toBe(true);
  });

  it('rejects draw() access', () => {
    const result = compileScript(SCRIPT_FIXTURES['draw-rejected'].source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('draw'))).toBe(true);
  });

  it('rejects async functions', () => {
    const result = compileScript(SCRIPT_FIXTURES['async-rejected'].source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('async'))).toBe(true);
  });
});

describe('compileScript golden fixtures', () => {
  it('compiles all expected-valid fixtures', () => {
    const validIds = ['line-midpoint', 'histogram-macd-style', 'hline-rsi-style', 'band-boll-style'] as const;
    for (const id of validIds) {
      const fixture = SCRIPT_FIXTURES[id];
      const result = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
      expect(result.ok, id).toBe(true);
    }
  });
});

describe('compileScript deterministic replay', () => {
  it('recompiles same normalized source to same artifactHash', () => {
    const base = SCRIPT_FIXTURES['line-midpoint'].source;
    const a = compileScript(base, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const b = compileScript(`  ${base}`, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(a.artifactHash).toBe(b.artifactHash);
  });

  it('changes artifactHash when source changes', () => {
    const base = SCRIPT_FIXTURES['line-midpoint'].source;
    const changed = base.replace('Midpoint', 'Midpoint v2');
    const a = compileScript(base, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const b = compileScript(changed, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(a.artifactHash).not.toBe(b.artifactHash);
    expect(b.manifest?.name).toBe('Midpoint v2');
  });
});

describe('compileScript source size budget', () => {
  it('rejects oversized source', () => {
    const huge = 'function edgeScript() { return {}; }\nedgeScript();\n'.repeat(5000);
    const result = compileScript(huge, { ...DEFAULT_SCRIPT_RUNTIME_BUDGETS, maxSourceBytes: 1024 });
    expect(result.ok).toBe(false);
  });
});

describe('compileScriptService façade', () => {
  it('delegates to compileScript with defaults', () => {
    const result = compileFacade({ source: SCRIPT_FIXTURES['line-midpoint'].source });
    expect(result.ok).toBe(true);
    expect(result.languageVersion).toBe(SCRIPT_LANGUAGE_VERSION);
  });
});

describe('makeSyntheticCandles helper', () => {
  it('creates deterministic candles', () => {
    const a = makeSyntheticCandles(50);
    const b = makeSyntheticCandles(50);
    expect(a.length).toBe(50);
    expect(a[0]?.t).toBe(b[0]?.t);
  });
});
