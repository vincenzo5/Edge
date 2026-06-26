import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const STREAM_ROUTE_FILES = [
  'src/app/api/stream/quotes/route.ts',
  'src/app/api/stream/candles/route.ts',
] as const;

describe('stream route segment config', () => {
  it('declares runtime inline (Next.js rejects re-exports)', () => {
    for (const file of STREAM_ROUTE_FILES) {
      const source = readFileSync(file, 'utf8');
      expect(source).toMatch(/export const runtime = ['"]nodejs['"]/);
      expect(source).not.toMatch(/export \{ runtime \}/);
    }
  });
});
