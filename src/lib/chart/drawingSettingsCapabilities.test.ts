import { describe, expect, it } from 'vitest';
import {
  dashPresetFromArray,
  drawingSettingsCapabilities,
  LINE_DASH_PRESETS,
} from './drawingSettingsCapabilities';

describe('drawingSettingsCapabilities', () => {
  it('enables extend for trend_line and ray only', () => {
    expect(drawingSettingsCapabilities('trend_line').showExtend).toBe(true);
    expect(drawingSettingsCapabilities('ray').showExtend).toBe(true);
    expect(drawingSettingsCapabilities('horizontal_line').showExtend).toBe(false);
  });

  it('enables fill for shape tools', () => {
    expect(drawingSettingsCapabilities('rectangle').showFill).toBe(true);
    expect(drawingSettingsCapabilities('parallel_channel').showFill).toBe(true);
    expect(drawingSettingsCapabilities('price_channel').showFill).toBe(true);
  });

  it('enables stick-entry toggle for long/short position tools', () => {
    expect(drawingSettingsCapabilities('long_position').showStickEntryToLastPrice).toBe(true);
    expect(drawingSettingsCapabilities('short_position').showStickEntryToLastPrice).toBe(true);
    expect(drawingSettingsCapabilities('trend_line').showStickEntryToLastPrice).toBe(false);
  });

  it('maps dash presets', () => {
    expect(dashPresetFromArray([])).toBe('solid');
    expect(dashPresetFromArray(LINE_DASH_PRESETS.dashed)).toBe('dashed');
    expect(dashPresetFromArray(LINE_DASH_PRESETS.dotted)).toBe('dotted');
  });
});
