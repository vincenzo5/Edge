#!/usr/bin/env npx tsx
/**
 * Headless Phase 0 spike: compile + execute golden script and print budget timings.
 */
import { performance } from 'node:perf_hooks';
import { SCRIPT_FIXTURES, makeSyntheticCandles, DEFAULT_SCRIPT_RUNTIME_BUDGETS } from '@edge/chart-core';
import { compileScript, executeArtifact, probeGuestCapabilities } from '@edge/indicator-runtime';

const candles = makeSyntheticCandles(5_000);

async function main() {
  const probe = await probeGuestCapabilities();
  console.log('Guest capability probe:', probe);

  const fixture = SCRIPT_FIXTURES['line-midpoint'];
  const t0 = performance.now();
  const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
  const compileMs = performance.now() - t0;
  if (!compiled.ok || !compiled.artifact || !compiled.manifest) {
    console.error('Compile failed', compiled.diagnostics);
    process.exit(1);
  }

  const t1 = performance.now();
  const executed = await executeArtifact({
    artifact: compiled.artifact,
    manifest: compiled.manifest,
    candles,
    inputs: fixture.defaultInputs ?? {},
    revision: compiled.artifactHash!,
    sessionKey: 'spike',
  });
  const executeMs = performance.now() - t1;

  console.log('Compile ms:', compileMs.toFixed(1));
  console.log('Execute ms:', executeMs.toFixed(1));
  console.log('Status:', executed.status);
  console.log('Series keys:', Object.keys(executed.series));
  console.log('Budgets:', DEFAULT_SCRIPT_RUNTIME_BUDGETS);

  if (executed.status !== 'ready') {
    console.error(executed.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
