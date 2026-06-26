'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChartAnnotationChannelMarker,
  ChartDataFeed,
  ChartDataMeta,
  ChartEventKind,
  ChartEventMarker,
  ChartOverlayResult,
  ChartReferenceLine,
} from '@edge/chart-core';
import { CHART_EVENT_OVERLAY_KINDS } from '@edge/chart-core';
import { mergeAnnotationMarkers } from './overlayMappers';

const DEFAULT_EVENT_KINDS: ChartEventKind[] = [...CHART_EVENT_OVERLAY_KINDS];

export type ChartOverlayState = {
  events: ChartEventMarker[];
  referenceLines: ChartReferenceLine[];
  annotations: ChartAnnotationChannelMarker[];
  meta: ChartDataMeta | null;
  loading: boolean;
};

const EMPTY: ChartOverlayState = {
  events: [],
  referenceLines: [],
  annotations: [],
  meta: null,
  loading: false,
};

export type UseChartOverlaysOptions = {
  feed: ChartDataFeed;
  symbol: string;
  enabled?: boolean;
  /** Delay overlay fetch so candle paint is not contended. Default 150ms. */
  deferMs?: number;
  /** Locally sourced annotation markers (e.g. drawing metadata). */
  localAnnotations?: ChartAnnotationChannelMarker[];
  /** Optional filter for event overlay kinds. Defaults to all channel kinds. */
  eventKinds?: ChartEventKind[];
};

export function useChartOverlays(
  feedOrOptions: ChartDataFeed | UseChartOverlaysOptions,
  legacySymbol?: string,
  legacyEnabled = true,
  legacyLocalAnnotations: ChartAnnotationChannelMarker[] = [],
): ChartOverlayState {
  const options: UseChartOverlaysOptions =
    typeof feedOrOptions === 'object' && 'feed' in feedOrOptions
      ? feedOrOptions
      : {
          feed: feedOrOptions,
          symbol: legacySymbol ?? '',
          enabled: legacyEnabled,
          localAnnotations: legacyLocalAnnotations,
        };

  const {
    feed,
    symbol,
    enabled = true,
    deferMs = 150,
    localAnnotations = [],
    eventKinds = DEFAULT_EVENT_KINDS,
  } = options;

  const eventKindsKey = eventKinds.join(',');

  const [state, setState] = useState<ChartOverlayState>(EMPTY);
  const feedRef = useRef(feed);
  feedRef.current = feed;

  const localAnnotationsKey = useMemo(
    () => JSON.stringify(localAnnotations.map((marker) => marker.id)),
    [localAnnotations],
  );

  useEffect(() => {
    if (!enabled || !feedRef.current.loadOverlays || !symbol) {
      setState({
        ...EMPTY,
        annotations: localAnnotations,
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [eventsResult, referenceResult, annotationsResult] = await Promise.all([
            feedRef.current.loadOverlays!({ symbol, channel: 'events', kinds: eventKinds }),
            feedRef.current.loadOverlays!({ symbol, channel: 'referenceLines', kinds: eventKinds }),
            feedRef.current.loadOverlays!({ symbol, channel: 'annotations' }),
          ]);
          if (cancelled) return;

          const allowedKinds = new Set(eventKinds);
          const events = (eventsResult.events ?? []).filter((event) =>
            allowedKinds.has(event.kind),
          );

          setState({
            events,
            referenceLines: referenceResult.referenceLines ?? [],
            annotations: mergeAnnotationMarkers(
              annotationsResult.annotations ?? [],
              localAnnotations,
            ),
            meta: eventsResult.meta ?? referenceResult.meta ?? annotationsResult.meta ?? null,
            loading: false,
          });
        } catch {
          if (!cancelled) {
            setState({
              ...EMPTY,
              annotations: localAnnotations,
              loading: false,
            });
          }
        }
      })();
    }, deferMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [symbol, enabled, deferMs, localAnnotationsKey, eventKindsKey]);

  return state;
}

export type { ChartOverlayResult };
