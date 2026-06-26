import type {
  ChartAnnotationChannelMarker,
  ChartEventMarker,
  ChartReferenceLine,
} from '@edge/chart-core';
import { ANNOTATION_KIND_LABELS, type AnnotationKind } from '@edge/chart-core';
import type { SerializedDrawing } from '@/lib/chartConfig';

/** Map drawing metadata into annotation overlay channel markers. */
export function drawingsToAnnotationMarkers(
  drawings: SerializedDrawing[],
  candles: { t: number }[],
): ChartAnnotationChannelMarker[] {
  const markers: ChartAnnotationChannelMarker[] = [];

  for (const drawing of drawings) {
    if (!drawing.visible || !drawing.metadata?.kind) continue;
    const point = drawing.points[0];
    if (!point) continue;

    const timestamp =
      typeof point.timestamp === 'number'
        ? point.timestamp
        : candles.find((bar) => bar.t)?.t ?? Date.now();
    const kind = drawing.metadata.kind as AnnotationKind;
    const label =
      (drawing.metadata.fields?.title as string | undefined) ??
      ANNOTATION_KIND_LABELS[kind] ??
      kind;

    markers.push({
      id: drawing.id ?? `annotation-${kind}-${timestamp}`,
      timestamp,
      price: typeof point.value === 'number' ? point.value : null,
      label,
      kind,
    });
  }

  return markers;
}

/** Derive horizontal reference lines from event markers that carry a price level. */
export function eventMarkersToReferenceLines(
  events: ChartEventMarker[],
): ChartReferenceLine[] {
  return events
    .filter((event) => event.price != null && Number.isFinite(event.price))
    .map((event) => ({
      id: `ref-${event.id}`,
      price: event.price!,
      label: event.title.slice(0, 24),
      color: referenceLineColorForKind(event.kind),
      lineDash: [6, 4],
      interactive: false,
    }));
}

function referenceLineColorForKind(kind: ChartEventMarker['kind']): string {
  switch (kind) {
    case 'earnings':
      return '#6366f1';
    case 'dividend':
      return '#22c55e';
    case 'options_expiration':
      return '#a78bfa';
    case 'macro':
      return '#f59e0b';
    default:
      return '#94a3b8';
  }
}

/** Merge overlay channel payloads without duplicate ids. */
export function mergeOverlayEvents(
  ...groups: ChartEventMarker[][]
): ChartEventMarker[] {
  const seen = new Set<string>();
  const merged: ChartEventMarker[] = [];
  for (const group of groups) {
    for (const event of group) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      merged.push(event);
    }
  }
  return merged.sort((a, b) => a.timestamp - b.timestamp);
}

export function mergeReferenceLines(
  ...groups: ChartReferenceLine[][]
): ChartReferenceLine[] {
  const seen = new Set<string>();
  const merged: ChartReferenceLine[] = [];
  for (const group of groups) {
    for (const line of group) {
      if (seen.has(line.id)) continue;
      seen.add(line.id);
      merged.push(line);
    }
  }
  return merged;
}

export function mergeAnnotationMarkers(
  ...groups: ChartAnnotationChannelMarker[][]
): ChartAnnotationChannelMarker[] {
  const seen = new Set<string>();
  const merged: ChartAnnotationChannelMarker[] = [];
  for (const group of groups) {
    for (const marker of group) {
      if (seen.has(marker.id)) continue;
      seen.add(marker.id);
      merged.push(marker);
    }
  }
  return merged;
}
