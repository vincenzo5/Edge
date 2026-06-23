import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartRangeBar from './ChartRangeBar';
import { BOTTOM_RANGE_PRESETS } from '@/lib/chart/rangePresets';
import { rangePresetLabel } from '@/lib/chart/rangePresets';

describe('ChartRangeBar timezone clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-03T18:17:57.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders live UTC clock on the right', () => {
    render(
      <ChartRangeBar
        selectedPreset={null}
        theme="dark"
        timeZone="UTC"
        onRangeSelect={vi.fn()}
        onTimeZoneChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Chart timezone: 18:17:57 UTC/i })).toBeTruthy();
  });

  it('opens timezone menu and selects a zone', () => {
    const onTimeZoneChange = vi.fn();
    render(
      <ChartRangeBar
        selectedPreset={null}
        theme="dark"
        timeZone="UTC"
        onRangeSelect={vi.fn()}
        onTimeZoneChange={onTimeZoneChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Chart timezone/i }));
    const ny = screen.getByRole('menuitemradio', { name: /New York/i });
    fireEvent.click(ny);
    expect(onTimeZoneChange).toHaveBeenCalledWith('America/New_York');
  });
});

describe('ChartRangeBar range presets', () => {
  it('renders all bottom-bar preset labels', () => {
    render(
      <ChartRangeBar
        selectedPreset={null}
        theme="dark"
        timeZone="UTC"
        onRangeSelect={vi.fn()}
        onTimeZoneChange={vi.fn()}
      />,
    );

    for (const preset of BOTTOM_RANGE_PRESETS) {
      expect(screen.getByRole('button', { name: rangePresetLabel(preset) })).toBeTruthy();
    }
  });

  it('calls onRangeSelect when preset clicked', () => {
    const onRangeSelect = vi.fn();
    render(
      <ChartRangeBar
        selectedPreset={null}
        theme="dark"
        timeZone="UTC"
        onRangeSelect={onRangeSelect}
        onTimeZoneChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '1Y' }));
    expect(onRangeSelect).toHaveBeenCalledWith('1y');
  });

  it('marks active preset with aria-pressed', () => {
    render(
      <ChartRangeBar
        selectedPreset="1y"
        theme="dark"
        timeZone="UTC"
        onRangeSelect={vi.fn()}
        onTimeZoneChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '1Y' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onGoToClick from calendar button', () => {
    const onGoToClick = vi.fn();
    render(
      <ChartRangeBar
        selectedPreset={null}
        theme="dark"
        timeZone="UTC"
        onRangeSelect={vi.fn()}
        onTimeZoneChange={vi.fn()}
        onGoToClick={onGoToClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to date' }));
    expect(onGoToClick).toHaveBeenCalled();
  });

  it('supports horizontal overflow for preset controls', () => {
    render(
      <ChartRangeBar
        selectedPreset={null}
        theme="dark"
        timeZone="UTC"
        onRangeSelect={vi.fn()}
        onTimeZoneChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('toolbar', { name: 'Chart range' }).className).toMatch(
      /overflow-x-auto/,
    );
  });
});
