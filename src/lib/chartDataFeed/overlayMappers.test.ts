import { describe, expect, it } from 'vitest';
import type { ChartEventMarker } from '@edge/chart-core';
import {
  drawingsToAnnotationMarkers,
  eventMarkersToReferenceLines,
  mergeOverlayEvents,
} from './overlayMappers';

describe('overlayMappers', () => {
  it('maps drawing metadata to annotation markers', () => {
    const markers = drawingsToAnnotationMarkers(
      [
        {
          id: 'd1',
          name: 'trend_line',
          label: 'Thesis',
          visible: true,
          locked: false,
          zLevel: 1,
          points: [{ timestamp: 1000, value: 150 }],
          metadata: { kind: 'thesis' },
        },
      ],
      [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
    );
    expect(markers).toHaveLength(1);
    expect(markers[0]?.kind).toBe('thesis');
    expect(markers[0]?.price).toBe(150);
  });

  it('derives reference lines from priced events', () => {
    const events: ChartEventMarker[] = [
      {
        id: 'e1',
        kind: 'earnings',
        timestamp: 1000,
        title: 'Q1 earnings',
        price: 180,
      },
    ];
    const lines = eventMarkersToReferenceLines(events);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.price).toBe(180);
  });

  it('merges overlay events without duplicate ids', () => {
    const merged = mergeOverlayEvents(
      [{ id: 'a', kind: 'news', timestamp: 2, title: 'b' }],
      [{ id: 'a', kind: 'news', timestamp: 2, title: 'b' }, { id: 'b', kind: 'macro', timestamp: 1, title: 'c' }],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe('b');
  });
});
