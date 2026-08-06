import type {
  ChartAnnotationChannelMarker,
  ChartEventMarker,
  ChartReferenceLine,
  IndicatorConfig,
  SerializedDrawing,
} from '@edge/chart-core';
import type { PriceAxisAnnotation } from '@edge/chart-core/priceAxisTypes';

/**
 * Stable empties for chart canvas props.
 * Default `= []` allocates a new array each render and can force full pane redraws
 * when those arrays sit in draw-invalidation dependency lists.
 */
export const EMPTY_DRAWINGS: SerializedDrawing[] = [];
export const EMPTY_INDICATORS: IndicatorConfig[] = [];
export const EMPTY_EVENT_MARKERS: ChartEventMarker[] = [];
export const EMPTY_REFERENCE_LINES: ChartReferenceLine[] = [];
export const EMPTY_ANNOTATION_MARKERS: ChartAnnotationChannelMarker[] = [];
export const EMPTY_PRICE_AXIS_ANNOTATIONS: PriceAxisAnnotation[] = [];
