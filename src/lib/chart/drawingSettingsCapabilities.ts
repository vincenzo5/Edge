/** Which drawing settings fields apply per tool (drives settings modal sections). */

const LINE_TOOLS = new Set([
  'trend_line',
  'ray',
  'horizontal_line',
  'vertical_line',
  'price_line',
  'measure',
  'fib_retracement',
  'circle',
]);

const EXTEND_TOOLS = new Set(['trend_line', 'ray']);

const FILL_TOOLS = new Set(['rectangle', 'parallel_channel', 'price_channel']);

const TEXT_TOOLS = new Set(['annotation']);

export type LineDashPreset = 'solid' | 'dashed' | 'dotted';

export const LINE_DASH_PRESETS: Record<LineDashPreset, number[]> = {
  solid: [],
  dashed: [8, 4],
  dotted: [2, 2],
};

export function dashPresetFromArray(dash: number[] | undefined): LineDashPreset {
  if (!dash || dash.length === 0) return 'solid';
  if (dash.length === 2 && dash[0] === 8 && dash[1] === 4) return 'dashed';
  if (dash.length === 2 && dash[0] === 2 && dash[1] === 2) return 'dotted';
  return dash.length > 0 ? 'dashed' : 'solid';
}

export function drawingSettingsCapabilities(toolName: string) {
  return {
    showLine: LINE_TOOLS.has(toolName) || FILL_TOOLS.has(toolName) || toolName === 'annotation',
    showDash: LINE_TOOLS.has(toolName) || FILL_TOOLS.has(toolName),
    showExtend: EXTEND_TOOLS.has(toolName),
    showFill: FILL_TOOLS.has(toolName),
    showText: TEXT_TOOLS.has(toolName),
  };
}
