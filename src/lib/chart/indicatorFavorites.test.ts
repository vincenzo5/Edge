import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  loadIndicatorFavorites,
  saveIndicatorFavorites,
  toggleIndicatorFavorite,
} from './indicatorFavorites';

describe('indicatorFavorites', () => {
  beforeEach(() => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return storage.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        storage.store[key] = value;
      },
    };
    vi.stubGlobal('localStorage', storage);
  });

  it('starts empty', () => {
    expect(loadIndicatorFavorites()).toEqual([]);
  });

  it('toggles favorites', () => {
    const afterAdd = toggleIndicatorFavorite('RSI');
    expect(afterAdd).toEqual(['RSI']);
    expect(loadIndicatorFavorites()).toEqual(['RSI']);

    const afterRemove = toggleIndicatorFavorite('RSI');
    expect(afterRemove).toEqual([]);
  });

  it('persists favorites', () => {
    saveIndicatorFavorites(['MA', 'MACD']);
    expect(loadIndicatorFavorites()).toEqual(['MA', 'MACD']);
  });
});
