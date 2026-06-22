import type { CellConfig, IndicatorConfig } from '@/lib/chartConfig';
import {
  PRICE_PANE_KEY,
  createIndicatorInstance,
  mergeChartSettings,
} from '@/lib/chartConfig';
import { getIndicator } from '../indicators/registry';
import { resolveIndicatorInputs } from '../indicatorInputs';
import type { ChartTemplatePayload, StudyTemplatePayload } from './types';
import { isStudyPayloadValid } from './validate';

export type ApplyResult = {
  cell: CellConfig;
  skipped: string[];
};

function remapPaneKey(key: string, idMap: Map<string, string>): string | null {
  if (key === PRICE_PANE_KEY) return key;
  const mapped = idMap.get(key);
  return mapped ?? null;
}

function remapPaneKeyList(
  keys: string[] | undefined,
  idMap: Map<string, string>,
): string[] | undefined {
  if (!keys) return undefined;
  const out = keys
    .map((k) => remapPaneKey(k, idMap))
    .filter((k): k is string => k != null);
  return out.length > 0 ? out : undefined;
}

function remapPaneHeights(
  heights: Record<string, number> | undefined,
  idMap: Map<string, string>,
): Record<string, number> | undefined {
  if (!heights) return undefined;
  const out: Record<string, number> = {};
  for (const [key, h] of Object.entries(heights)) {
    const mapped = remapPaneKey(key, idMap);
    if (mapped) out[mapped] = h;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function instantiateStudyFromTemplate(
  payload: StudyTemplatePayload,
): IndicatorConfig | null {
  if (!isStudyPayloadValid(payload)) return null;
  const plugin = getIndicator(payload.name);
  if (!plugin) return null;

  const base = createIndicatorInstance(payload.name, payload.pane);
  const merged: IndicatorConfig = {
    ...base,
    inputs: payload.inputs ? { ...payload.inputs } : base.inputs,
    styles: payload.styles ? { ...payload.styles } : undefined,
    visible: payload.visible ?? true,
  };

  const resolved = resolveIndicatorInputs(plugin, merged);
  merged.inputs = { ...resolved };

  return merged;
}

export function applyStudyTemplate(
  cell: CellConfig,
  payload: StudyTemplatePayload,
): ApplyResult {
  const inst = instantiateStudyFromTemplate(payload);
  if (!inst) {
    return { cell, skipped: [payload.name] };
  }
  return {
    cell: {
      ...cell,
      indicators: [...cell.indicators, inst],
    },
    skipped: [],
  };
}

export function applyChartTemplate(
  cell: CellConfig,
  payload: ChartTemplatePayload,
): ApplyResult {
  const skipped: string[] = [];
  const idMap = new Map<string, string>();
  const indicators: IndicatorConfig[] = [];

  for (const saved of payload.indicators) {
    const inst = instantiateStudyFromTemplate(saved);
    if (!inst) {
      skipped.push(saved.name);
      continue;
    }
    if (saved.templateKey) {
      idMap.set(saved.templateKey, inst.id);
    }
    indicators.push(inst);
  }

  const paneOrder = remapPaneKeyList(payload.paneOrder, idMap);
  const collapsedPanes = remapPaneKeyList(payload.collapsedPanes, idMap);
  const paneHeights = remapPaneHeights(payload.paneHeights, idMap);
  let maximizedPane = payload.maximizedPane ?? null;
  if (maximizedPane != null) {
    const mapped = remapPaneKey(maximizedPane, idMap);
    maximizedPane = mapped;
  }

  return {
    cell: {
      ...cell,
      chartType: payload.chartType,
      chartSettings: mergeChartSettings(payload.chartSettings),
      indicators,
      paneOrder,
      collapsedPanes,
      paneHeights,
      maximizedPane,
    },
    skipped,
  };
}
