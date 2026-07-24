import { describe, expect, it } from 'vitest';
import { createGeometryBufferPool } from './geometryBufferPool';

describe('geometryBufferPool', () => {
  it('reuses backing store when capacity is sufficient', () => {
    const pool = createGeometryBufferPool();
    const first = pool.fromNumbers('slot', [1, 2, 3, 4]);
    const second = pool.fromNumbers('slot', [5, 6, 7, 8]);
    expect(first.buffer).toBe(second.buffer);
    expect(second[0]).toBe(5);
    expect(second.length).toBe(4);
  });

  it('grows buffer when values exceed capacity', () => {
    const pool = createGeometryBufferPool();
    const small = pool.fromNumbers('slot', [1, 2]);
    const large = pool.fromNumbers('slot', Array.from({ length: 200 }, (_, i) => i));
    expect(large.length).toBe(200);
    expect(large.buffer.byteLength).toBeGreaterThan(small.buffer.byteLength);
  });

  it('clear drops retained slots', () => {
    const pool = createGeometryBufferPool();
    const first = pool.fromNumbers('slot', [1, 2, 3, 4]);
    pool.clear();
    const second = pool.fromNumbers('slot', [1, 2, 3, 4]);
    expect(first.buffer).not.toBe(second.buffer);
  });
});
