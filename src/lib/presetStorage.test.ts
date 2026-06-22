import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  loadPresets,
  savePreset,
  deletePreset,
  createChartPreset,
  MAX_PRESETS,
} from './presetStorage';

describe('presetStorage', () => {
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

  it('returns empty array when storage is empty', () => {
    expect(loadPresets()).toEqual([]);
  });

  it('saves and loads presets', () => {
    const preset = createChartPreset('Test', {
      chartType: 'candle_solid',
      indicators: [],
      chartSettings: undefined,
    });
    savePreset(preset);
    expect(loadPresets()).toHaveLength(1);
    expect(loadPresets()[0]?.name).toBe('Test');
  });

  it('deletes preset by id', () => {
    const preset = createChartPreset('Delete me', {
      chartType: 'candle_solid',
      indicators: [],
      chartSettings: undefined,
    });
    savePreset(preset);
    deletePreset(preset.id);
    expect(loadPresets()).toHaveLength(0);
  });

  it('rejects save when cap reached', () => {
    for (let i = 0; i < MAX_PRESETS; i++) {
      savePreset(
        createChartPreset(`Preset ${i}`, {
          chartType: 'candle_solid',
          indicators: [],
          chartSettings: undefined,
        }),
      );
    }
    const extra = createChartPreset('Overflow', {
      chartType: 'candle_solid',
      indicators: [],
      chartSettings: undefined,
    });
    const result = savePreset(extra);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('cap');
    }
  });

  it('returns empty array for invalid JSON', () => {
    localStorage.setItem('tv-ai:presets:v1', '{not-json');
    expect(loadPresets()).toEqual([]);
  });
});
