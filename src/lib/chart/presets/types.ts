import type { CellConfig } from '@/lib/chartConfig';
import type { ChartSettings } from '@/lib/chart/chartSettings';
import type { IndicatorConfig } from '@/lib/chart/contracts';

export type StudyTemplatePayload = Pick<
  IndicatorConfig,
  'name' | 'pane' | 'inputs' | 'styles' | 'visible'
>;

export type ChartTemplatePayload = Pick<
  CellConfig,
  | 'chartType'
  | 'chartSettings'
  | 'paneOrder'
  | 'paneHeights'
  | 'collapsedPanes'
  | 'maximizedPane'
> & {
  /** Saved without instance ids; templateKey used for pane remapping on apply. */
  indicators: Array<
    StudyTemplatePayload & { templateKey?: string }
  >;
};

export type PresetKind = 'chart' | 'study';

export type PresetEnvelope = {
  version: 1;
  id: string;
  name: string;
  createdAt: number;
} & (
  | { kind: 'chart'; payload: ChartTemplatePayload }
  | { kind: 'study'; payload: StudyTemplatePayload }
);

export function createPresetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function chartTemplateFromCell(
  cell: CellConfig,
): ChartTemplatePayload {
  return {
    chartType: cell.chartType,
    chartSettings: cell.chartSettings ? { ...cell.chartSettings } : undefined,
    paneOrder: cell.paneOrder ? [...cell.paneOrder] : undefined,
    paneHeights: cell.paneHeights ? { ...cell.paneHeights } : undefined,
    collapsedPanes: cell.collapsedPanes ? [...cell.collapsedPanes] : undefined,
    maximizedPane: cell.maximizedPane ?? null,
    indicators: cell.indicators.map((ind) => ({
      templateKey: ind.id,
      name: ind.name,
      pane: ind.pane,
      inputs: ind.inputs ? { ...ind.inputs } : undefined,
      styles: ind.styles ? { ...ind.styles } : undefined,
      visible: ind.visible,
    })),
  };
}

export function studyTemplateFromIndicator(
  indicator: IndicatorConfig,
): StudyTemplatePayload {
  return {
    name: indicator.name,
    pane: indicator.pane,
    inputs: indicator.inputs ? { ...indicator.inputs } : undefined,
    styles: indicator.styles ? { ...indicator.styles } : undefined,
    visible: indicator.visible,
  };
}
