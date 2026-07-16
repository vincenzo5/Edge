import type { DrawingStyles, SerializedDrawing, Theme } from './contracts';
import { defaultColorForKind } from './annotationMetadata';

export type { DrawingStyles };

const DARK_LINE = '#64748b';
const LIGHT_LINE = '#475569';

export function defaultStylesForTool(toolName: string): DrawingStyles {
  const base: DrawingStyles = {
    lineWidth: 1.5,
    lineDash: [],
    fillOpacity: 0,
    extendLeft: false,
    extendRight: false,
  };
  if (toolName === 'long_position' || toolName === 'short_position') {
    return { ...base, stickEntryToLastPrice: true };
  }
  return base;
}

export function mergeStyles(
  base: DrawingStyles,
  patch: Partial<DrawingStyles>
): DrawingStyles {
  return { ...base, ...patch };
}

export function resolveDrawingStyles(
  drawing: SerializedDrawing,
  theme: Theme,
  selected: boolean
): DrawingStyles {
  const defaults = {
    ...defaultStylesForTool(drawing.name),
    lineColor: theme === 'dark' ? DARK_LINE : LIGHT_LINE,
  };
  const merged = drawing.styles ? mergeStyles(defaults, drawing.styles) : defaults;
  if (drawing.metadata?.kind && drawing.styles?.lineColor == null) {
    merged.lineColor = defaultColorForKind(drawing.metadata.kind, theme);
  }
  if (selected) {
    return { ...merged, lineColor: '#f59e0b' };
  }
  return merged;
}
