"use client";

import IndicatorPicker from "../IndicatorPicker";
import IndicatorSettingsModal from "../IndicatorSettingsModal";
import DrawingSettingsModal from "../DrawingSettingsModal";
import ChartSettingsModal from "../ChartSettingsModal";
import ChartGoToModal from "../ChartGoToModal";
import DrawingRenameModal from "../DrawingRenameModal";
import TemplatePickerModal from "../TemplatePickerModal";
import BarReplay from "../BarReplay";
import type { ChartHandle } from "../EdgeChart";
import type { DrawingStyles } from "@/lib/chart/contracts";
import type { GoToRequest } from "@/lib/chart/goTo";
import type {
  CellConfig,
  IndicatorConfig,
  RequiredChartSettings,
  SerializedDrawing,
  Theme,
} from "@/lib/chartConfig";
import type { PresetEnvelope } from "@/lib/chart/presets/types";

type ChartTemplatePreset = Extract<PresetEnvelope, { kind: "chart" }>;

type Props = {
  compact: boolean;
  theme: Theme;
  config: CellConfig;
  chartRef: React.RefObject<ChartHandle | null>;
  pickerOpen: boolean;
  onPickerClose: () => void;
  onAddIndicator: (ind: Pick<IndicatorConfig, "name" | "pane">) => void;
  settingsIndicator: IndicatorConfig | null;
  settingsIndicatorId: string | null;
  onSettingsIndicatorClose: () => void;
  onIndicatorParamsSave: (
    id: string,
    patch: {
      inputs?: Record<string, import("@/lib/chart/plugin-api").InputValue>;
      styles?: Record<string, import("@/lib/chart/contracts").LineStyleOverride>;
    },
  ) => void;
  onSaveStudyTemplate?: () => void;
  settingsDrawing: SerializedDrawing | null;
  settingsOverlayId: string | null;
  onSettingsOverlayClose: () => void;
  onDrawingStylesSave: (id: string, patch: Partial<DrawingStyles>) => void;
  chartSettingsOpen: boolean;
  chartSettingsSection: "symbol" | "status" | "scales" | "canvas" | "trading";
  onChartSettingsClose: () => void;
  onChartSettingsSave: (next: RequiredChartSettings) => void;
  chartTemplates: ChartTemplatePreset[];
  onSaveChartTemplate: (settingsDraft?: RequiredChartSettings) => void;
  onApplyTemplate: (preset: PresetEnvelope) => void;
  goToOpen: boolean;
  onGoToClose: () => void;
  crosshairTimestamp: number | null;
  lastCandleTimestamp: number | null;
  onGoTo: (req: GoToRequest) => ReturnType<NonNullable<ChartHandle["goTo"]>>;
  renameOverlayId: string | null;
  renameOverlayLabel: string;
  onRenameOverlayClose: () => void;
  onRenameOverlaySave: (label: string) => void;
  templatePickerOpen: boolean;
  templatePickerTab: "chart" | "study";
  onTemplatePickerClose: () => void;
  replayActive: boolean;
  candleCount: number;
  onReplayVisibleChange: (count: number | null) => void;
};

export default function ChartCellDialogs({
  compact,
  theme,
  config,
  chartRef,
  pickerOpen,
  onPickerClose,
  onAddIndicator,
  settingsIndicator,
  settingsIndicatorId,
  onSettingsIndicatorClose,
  onIndicatorParamsSave,
  onSaveStudyTemplate,
  settingsDrawing,
  settingsOverlayId,
  onSettingsOverlayClose,
  onDrawingStylesSave,
  chartSettingsOpen,
  chartSettingsSection,
  onChartSettingsClose,
  onChartSettingsSave,
  chartTemplates,
  onSaveChartTemplate,
  onApplyTemplate,
  goToOpen,
  onGoToClose,
  crosshairTimestamp,
  lastCandleTimestamp,
  onGoTo,
  renameOverlayId,
  renameOverlayLabel,
  onRenameOverlayClose,
  onRenameOverlaySave,
  templatePickerOpen,
  templatePickerTab,
  onTemplatePickerClose,
  replayActive,
  candleCount,
  onReplayVisibleChange,
}: Props) {
  return (
    <>
      {!compact && replayActive && (
        <BarReplay
          total={candleCount}
          onVisibleChange={onReplayVisibleChange}
          disabled={false}
        />
      )}

      <IndicatorPicker
        open={pickerOpen}
        active={config.indicators}
        theme={theme}
        onAdd={onAddIndicator}
        onClose={onPickerClose}
      />

      <IndicatorSettingsModal
        open={settingsIndicatorId != null}
        indicator={settingsIndicator}
        theme={theme}
        onClose={onSettingsIndicatorClose}
        onSave={onIndicatorParamsSave}
        onSaveAsTemplate={onSaveStudyTemplate}
      />

      <DrawingSettingsModal
        open={settingsOverlayId != null}
        drawing={settingsDrawing}
        theme={theme}
        onClose={onSettingsOverlayClose}
        onSave={onDrawingStylesSave}
      />

      <ChartSettingsModal
        open={chartSettingsOpen}
        settings={config.chartSettings}
        initialSection={chartSettingsSection}
        onClose={onChartSettingsClose}
        onSave={onChartSettingsSave}
        chartTemplates={chartTemplates}
        onSaveTemplate={onSaveChartTemplate}
        onApplyTemplate={(preset) => {
          onApplyTemplate(preset);
          onChartSettingsClose();
        }}
      />

      <ChartGoToModal
        open={goToOpen}
        theme={theme}
        interval={config.interval}
        defaultTimestampMs={crosshairTimestamp ?? lastCandleTimestamp ?? null}
        onClose={onGoToClose}
        onGoTo={onGoTo}
      />

      <DrawingRenameModal
        open={renameOverlayId != null}
        theme={theme}
        initialLabel={renameOverlayLabel}
        onClose={onRenameOverlayClose}
        onSave={onRenameOverlaySave}
      />

      <TemplatePickerModal
        open={templatePickerOpen}
        initialTab={templatePickerTab}
        onClose={onTemplatePickerClose}
        onApply={onApplyTemplate}
      />
    </>
  );
}
