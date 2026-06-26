import type { Candle, ChartEventKind, ChartEventMarker, Theme, VisibleRange } from '@edge/chart-core';
import {
  eventRailCenterY,
  EVENT_RAIL_HEIGHT,
  plotHeight,
} from '@edge/chart-core/layout';

export const EVENT_BADGE_RADIUS = 8;
export const EVENT_BADGE_MIN_GAP = 18;
const MAX_RAIL_STACK_ROWS = 2;

const KIND_PRIORITY: Record<ChartEventKind, number> = {
  earnings: 100,
  dividend: 90,
  split: 80,
  filing: 70,
  macro: 60,
  news: 50,
  options_expiration: 10,
};

const KIND_GLYPH: Record<ChartEventKind, string> = {
  earnings: 'E',
  dividend: 'D',
  split: 'S',
  filing: 'F',
  macro: 'M',
  news: '⚡',
  options_expiration: 'O',
};

const KIND_COLORS: Record<ChartEventKind, { dark: string; light: string }> = {
  earnings: { dark: '#6366f1', light: '#4f46e5' },
  dividend: { dark: '#22c55e', light: '#16a34a' },
  split: { dark: '#f59e0b', light: '#d97706' },
  filing: { dark: '#94a3b8', light: '#64748b' },
  macro: { dark: '#f59e0b', light: '#d97706' },
  news: { dark: '#a78bfa', light: '#7c3aed' },
  options_expiration: { dark: '#818cf8', light: '#6366f1' },
};

export type EventBadgeGroup = {
  id: string;
  candleIndex: number;
  timestamp: number;
  x: number;
  y: number;
  radius: number;
  events: ChartEventMarker[];
  glyph: string;
  color: string;
  stackLevel: number;
};

export function eventBadgeColor(kind: ChartEventKind, theme: Theme): string {
  const palette = KIND_COLORS[kind] ?? KIND_COLORS.filing;
  return theme === 'dark' ? palette.dark : palette.light;
}

export function dominantEventKind(events: ChartEventMarker[]): ChartEventKind {
  let best = events[0]?.kind ?? 'filing';
  let bestScore = KIND_PRIORITY[best] ?? 0;
  for (const event of events) {
    const score = KIND_PRIORITY[event.kind] ?? 0;
    if (score > bestScore) {
      best = event.kind;
      bestScore = score;
    }
  }
  return best;
}

export function badgeGlyphForEvents(events: ChartEventMarker[]): string {
  if (events.length > 1) return String(events.length);
  const kind = events[0]?.kind ?? 'filing';
  return KIND_GLYPH[kind] ?? '?';
}

function calendarDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** Match event timestamp to the candle on the same calendar day. */
function candleIndexForTimestamp(candles: Candle[], timestamp: number): number {
  const eventDay = calendarDayKey(timestamp);
  for (let i = 0; i < candles.length; i++) {
    const barDay = calendarDayKey(candles[i]!.t);
    if (barDay === eventDay) return i;
    if (barDay > eventDay) return Math.max(0, i - 1);
  }
  return candles.length - 1;
}

type MarkerPlacement = {
  marker: ChartEventMarker;
  candleIndex: number;
  x: number;
};

function visibleMarkerPlacements(
  markers: ChartEventMarker[],
  vp: VisibleRange,
  candles: Candle[],
): MarkerPlacement[] {
  const placements: MarkerPlacement[] = [];
  for (const marker of markers) {
    const idx = candleIndexForTimestamp(candles, marker.timestamp);
    if (idx < vp.startIndex || idx > vp.endIndex) continue;
    placements.push({
      marker,
      candleIndex: idx,
      x: vp.xForIndex(idx),
    });
  }
  placements.sort((a, b) => a.x - b.x);
  return placements;
}

/** Merge placements whose screen X positions overlap into one badge group. */
function clusterPlacements(placements: MarkerPlacement[]): MarkerPlacement[][] {
  if (placements.length === 0) return [];
  const clusters: MarkerPlacement[][] = [[placements[0]!]];
  for (let i = 1; i < placements.length; i++) {
    const current = placements[i]!;
    const prevCluster = clusters[clusters.length - 1]!;
    const prevX = prevCluster.reduce((sum, p) => sum + p.x, 0) / prevCluster.length;
    const minDistance = EVENT_BADGE_RADIUS * 2 + EVENT_BADGE_MIN_GAP;
    if (current.x - prevX < minDistance) {
      prevCluster.push(current);
    } else {
      clusters.push([current]);
    }
  }
  return clusters;
}

function buildGroupFromCluster(
  cluster: MarkerPlacement[],
  vp: VisibleRange,
  candles: Candle[],
  theme: Theme,
  baseY: number,
  groupIndex: number,
): EventBadgeGroup {
  const events = cluster
    .map((p) => p.marker)
    .sort((a, b) => b.timestamp - a.timestamp);
  const candleIndex = cluster.reduce(
    (best, p) => (Math.abs(p.x - vp.xForIndex(p.candleIndex)) < Math.abs(best.x - vp.xForIndex(best.candleIndex)) ? p : best),
    cluster[0]!,
  ).candleIndex;
  const x =
    cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
  const kind = dominantEventKind(events);
  return {
    id: `event-badge-${groupIndex}-${candleIndex}`,
    candleIndex,
    timestamp: events[0]?.timestamp ?? candles[candleIndex]?.t ?? 0,
    x,
    y: baseY,
    radius: EVENT_BADGE_RADIUS,
    events,
    glyph: badgeGlyphForEvents(events),
    color: eventBadgeColor(kind, theme),
    stackLevel: 0,
  };
}

/** Stack badges vertically within the event rail when horizontal space is tight. */
export function resolveBadgeCollisions(groups: EventBadgeGroup[]): EventBadgeGroup[] {
  if (groups.length <= 1) return groups;

  const resolved = groups.map((group) => ({ ...group }));
  const rowStep = EVENT_BADGE_RADIUS * 2 + 2;
  const maxStack = MAX_RAIL_STACK_ROWS - 1;

  for (let i = 1; i < resolved.length; i++) {
    const prev = resolved[i - 1]!;
    const current = resolved[i]!;
    const minDistance = prev.radius + current.radius + EVENT_BADGE_MIN_GAP;
    if (current.x - prev.x < minDistance) {
      const nextLevel = Math.min(prev.stackLevel + 1, maxStack);
      current.stackLevel = nextLevel;
      current.y = prev.y - rowStep * nextLevel;
    }
  }
  return resolved;
}

/** Group visible event markers by screen proximity and compute event-rail badge positions. */
export function layoutEventBadgeGroups(
  markers: ChartEventMarker[],
  vp: VisibleRange,
  candles: Candle[],
  theme: Theme,
  showTimeAxis = true,
  reserveEventRail = false,
): EventBadgeGroup[] {
  if (markers.length === 0 || candles.length === 0) return [];

  const useRail = reserveEventRail || (vp.reserveEventRail ?? false);
  const baseY = useRail
    ? eventRailCenterY(vp.height, showTimeAxis)
    : plotHeight(vp.height, showTimeAxis) - EVENT_BADGE_RADIUS - 6;

  const placements = visibleMarkerPlacements(markers, vp, candles);
  const clusters = clusterPlacements(placements);

  const groups = clusters.map((cluster, index) =>
    buildGroupFromCluster(cluster, vp, candles, theme, baseY, index),
  );

  groups.sort((a, b) => a.x - b.x);
  return resolveBadgeCollisions(groups);
}

export function hitTestEventBadge(
  plotX: number,
  plotY: number,
  groups: EventBadgeGroup[],
): EventBadgeGroup | null {
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]!;
    const dx = plotX - group.x;
    const dy = plotY - group.y;
    const hitRadius = group.radius + 4;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      return group;
    }
  }
  return null;
}

/** Top Y of the event rail strip (for guide lines and backgrounds). */
export function eventRailTopY(height: number, showTimeAxis = true): number {
  return plotHeight(height, showTimeAxis, true);
}

export { EVENT_RAIL_HEIGHT };
