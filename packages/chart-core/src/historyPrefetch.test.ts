import { describe, expect, it } from 'vitest';
import {
  computePrefetchThreshold,
  computeUrgentThreshold,
  isUrgentPrefetch,
  shouldBackgroundPrefetch,
  shouldPrefetchHistory,
} from './historyPrefetch';

describe('computePrefetchThreshold', () => {
  it('scales with visible bars using the lookahead ratio', () => {
    expect(computePrefetchThreshold(100)).toBe(50);
    expect(computePrefetchThreshold(200)).toBe(100);
  });

  it('never drops below the minimum threshold', () => {
    expect(computePrefetchThreshold(20)).toBe(50);
    expect(computePrefetchThreshold(1)).toBe(50);
  });
});

describe('computeUrgentThreshold', () => {
  it('scales with visible bars using the urgent ratio', () => {
    expect(computeUrgentThreshold(100)).toBe(10);
    expect(computeUrgentThreshold(200)).toBe(20);
  });

  it('never drops below the urgent minimum', () => {
    expect(computeUrgentThreshold(20)).toBe(10);
  });
});

describe('shouldPrefetchHistory', () => {
  const base = {
    startIndex: 40,
    visibleBars: 100,
    loadedBars: 500,
    hasMore: true,
    userHasPanned: true,
  };

  it('returns true when startIndex is below the dynamic threshold', () => {
    expect(shouldPrefetchHistory(base)).toBe(true);
  });

  it('returns false when startIndex is at or above threshold', () => {
    expect(shouldPrefetchHistory({ ...base, startIndex: 50 })).toBe(false);
    expect(shouldPrefetchHistory({ ...base, startIndex: 80 })).toBe(false);
  });

  it('returns false when hasMore is false', () => {
    expect(shouldPrefetchHistory({ ...base, hasMore: false })).toBe(false);
  });

  it('returns false when user has not panned', () => {
    expect(shouldPrefetchHistory({ ...base, userHasPanned: false })).toBe(false);
  });

  it('returns false when no bars are loaded', () => {
    expect(shouldPrefetchHistory({ ...base, loadedBars: 0 })).toBe(false);
  });
});

describe('isUrgentPrefetch', () => {
  it('returns true only inside the urgent window', () => {
    const input = {
      startIndex: 5,
      visibleBars: 100,
      loadedBars: 500,
      hasMore: true,
      userHasPanned: true,
    };
    expect(isUrgentPrefetch(input)).toBe(true);
  });

  it('returns false outside the urgent window but inside prefetch window', () => {
    const input = {
      startIndex: 30,
      visibleBars: 100,
      loadedBars: 500,
      hasMore: true,
      userHasPanned: true,
    };
    expect(isUrgentPrefetch(input)).toBe(false);
    expect(shouldPrefetchHistory(input)).toBe(true);
  });
});

describe('shouldBackgroundPrefetch', () => {
  it('returns true when history may exist and bars are loaded', () => {
    expect(shouldBackgroundPrefetch(true, 250)).toBe(true);
  });

  it('returns false when hasMore is false or series is empty', () => {
    expect(shouldBackgroundPrefetch(false, 250)).toBe(false);
    expect(shouldBackgroundPrefetch(true, 0)).toBe(false);
  });
});
