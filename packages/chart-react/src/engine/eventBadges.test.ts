import { describe, expect, it } from 'vitest';
import type { ChartEventMarker } from '@edge/chart-core';
import { EVENT_RAIL_HEIGHT, plotHeight } from '@edge/chart-core/layout';
import {
  badgeGlyphForEvents,
  dominantEventKind,
  layoutEventBadgeGroups,
  resolveBadgeCollisions,
  hitTestEventBadge,
  eventRailTopY,
} from './eventBadges';

function marker(id: string, kind: ChartEventMarker['kind'], timestamp: number): ChartEventMarker {
  return { id, kind, timestamp, title: id, symbol: 'AAPL' };
}

describe('eventBadges', () => {
  it('groups events on the same candle and prefers dominant glyph', () => {
    const events = [
      marker('n1', 'news', 1000),
      marker('e1', 'earnings', 1000),
    ];
    expect(dominantEventKind(events)).toBe('earnings');
    expect(badgeGlyphForEvents(events)).toBe('2');
  });

  it('resolves horizontal collisions by stacking within the rail', () => {
    const stacked = resolveBadgeCollisions([
      {
        id: 'a',
        candleIndex: 0,
        timestamp: 1,
        x: 10,
        y: 100,
        radius: 8,
        events: [],
        glyph: 'E',
        color: '#6366f1',
        stackLevel: 0,
      },
      {
        id: 'b',
        candleIndex: 1,
        timestamp: 2,
        x: 20,
        y: 100,
        radius: 8,
        events: [],
        glyph: 'D',
        color: '#22c55e',
        stackLevel: 0,
      },
    ]);
    expect(stacked[1]?.stackLevel).toBe(1);
    expect(stacked[1]?.y).toBeLessThan(stacked[0]?.y ?? 0);
  });

  it('hit-tests badge bounds', () => {
    const group = {
      id: 'a',
      candleIndex: 0,
      timestamp: 1,
      x: 50,
      y: 50,
      radius: 8,
      events: [],
      glyph: 'E',
      color: '#6366f1',
      stackLevel: 0,
    };
    expect(hitTestEventBadge(50, 50, [group])?.id).toBe('a');
    expect(hitTestEventBadge(80, 50, [group])).toBeNull();
  });

  it('layouts badges in the event rail when reserved', () => {
    const height = 200;
    const candles = [
      { t: Date.parse('2026-01-01T12:00:00.000Z'), o: 1, h: 1, l: 1, c: 1, v: 1 },
      { t: Date.parse('2026-01-02T12:00:00.000Z'), o: 1, h: 1, l: 1, c: 1, v: 1 },
      { t: Date.parse('2026-01-03T12:00:00.000Z'), o: 1, h: 1, l: 1, c: 1, v: 1 },
    ];
    const vp = {
      startIndex: 0,
      endIndex: 2,
      width: 300,
      height,
      priceMin: 0,
      priceMax: 10,
      reserveTimeAxis: true,
      reserveEventRail: true,
      xForIndex: (idx: number) => idx * 100 + 50,
      yForPrice: (price: number) => 100 - price * 10,
    };
    const groups = layoutEventBadgeGroups(
      [marker('e1', 'earnings', Date.parse('2026-01-02T12:00:00.000Z'))],
      vp,
      candles,
      'dark',
      true,
      true,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.candleIndex).toBe(1);
    expect(groups[0]?.glyph).toBe('E');
    expect(groups[0]?.y).toBeGreaterThan(eventRailTopY(height, true));
    expect(groups[0]?.y).toBeLessThan(plotHeight(height, true) + EVENT_RAIL_HEIGHT);
  });

  it('clusters nearby markers into one count badge', () => {
    const candles = [
      { t: Date.parse('2026-01-01T12:00:00.000Z'), o: 1, h: 1, l: 1, c: 1, v: 1 },
      { t: Date.parse('2026-01-02T12:00:00.000Z'), o: 1, h: 1, l: 1, c: 1, v: 1 },
    ];
    const vp = {
      startIndex: 0,
      endIndex: 1,
      width: 120,
      height: 200,
      priceMin: 0,
      priceMax: 10,
      reserveTimeAxis: true,
      reserveEventRail: true,
      xForIndex: (idx: number) => idx * 28 + 20,
      yForPrice: (price: number) => 100 - price * 10,
    };
    const groups = layoutEventBadgeGroups(
      [
        marker('e1', 'earnings', Date.parse('2026-01-01T12:00:00.000Z')),
        marker('d1', 'dividend', Date.parse('2026-01-02T12:00:00.000Z')),
      ],
      vp,
      candles,
      'dark',
      true,
      true,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.events).toHaveLength(2);
    expect(groups[0]?.glyph).toBe('2');
  });
});
