import { describe, expect, it } from 'vitest';

describe('startup test harness', () => {
  it('runs the shared Vitest environment', () => {
    expect(globalThis.ResizeObserver).toBeDefined();
  });

  it('resolves the @ path alias', async () => {
    const { isPersistenceEnabled } = await import('@/lib/persistence/auth/getCurrentUser');
    expect(typeof isPersistenceEnabled).toBe('function');
  });
});
