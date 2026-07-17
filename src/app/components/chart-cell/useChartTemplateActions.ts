"use client";

import { useCallback, useMemo } from "react";
import { applyChartTemplate, applyStudyTemplate } from "@/lib/chart/presets/apply";
import {
  chartTemplateFromCell,
  studyTemplateFromIndicator,
  type PresetEnvelope,
} from "@/lib/chart/presets/types";
import {
  createChartPreset,
  createStudyPreset,
  listPresetsByKind,
  savePreset,
} from "@/lib/presetStorage";
import {
  serializeChartSettings,
  type CellConfig,
  type IndicatorConfig,
  type RequiredChartSettings,
} from "@/lib/chartConfig";

type ChartTemplatePreset = Extract<PresetEnvelope, { kind: "chart" }>;

type Params = {
  config: CellConfig;
  onConfigChange: (next: CellConfig) => void;
  chartSettingsOpen: boolean;
  templatePickerOpen: boolean;
  templateRevision: number;
  setContextMenu: React.Dispatch<
    React.SetStateAction<{
      position: { x: number; y: number };
      items: import("../ContextMenu").ContextMenuItem[];
      header?: string;
    } | null>
  >;
  setTemplateRevision: React.Dispatch<React.SetStateAction<number>>;
  setTemplatePickerTab: React.Dispatch<React.SetStateAction<"chart" | "study">>;
  setTemplatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useChartTemplateActions({
  config,
  onConfigChange,
  chartSettingsOpen,
  templatePickerOpen,
  templateRevision,
  setContextMenu,
  setTemplateRevision,
  setTemplatePickerTab,
  setTemplatePickerOpen,
}: Params) {
  const bumpTemplateRevision = useCallback(() => {
    setTemplateRevision((revision) => revision + 1);
  }, [setTemplateRevision]);

  const chartTemplates = useMemo(
    () =>
      listPresetsByKind("chart").filter(
        (preset): preset is ChartTemplatePreset => preset.kind === "chart",
      ),
    [chartSettingsOpen, templatePickerOpen, templateRevision],
  );

  const handleSaveChartTemplate = useCallback(
    (settingsDraft?: RequiredChartSettings) => {
      const name = prompt("Chart template name:");
      if (!name?.trim()) return;
      const sourceConfig = settingsDraft
        ? { ...config, chartSettings: serializeChartSettings(settingsDraft) }
        : config;
      const preset = createChartPreset(name.trim(), chartTemplateFromCell(sourceConfig));
      const result = savePreset(preset);
      if (!result.ok) {
        alert("Template limit reached (50). Delete one to save a new template.");
      } else {
        bumpTemplateRevision();
      }
      setContextMenu(null);
    },
    [config, bumpTemplateRevision, setContextMenu],
  );

  const handleApplyTemplate = useCallback(
    (preset: PresetEnvelope) => {
      if (preset.kind === "chart") {
        const { cell, skipped } = applyChartTemplate(config, preset.payload);
        onConfigChange(cell);
        if (skipped.length > 0) {
          alert(`Skipped unavailable indicators: ${skipped.join(", ")}`);
        }
      } else {
        const { cell, skipped } = applyStudyTemplate(config, preset.payload);
        onConfigChange(cell);
        if (skipped.length > 0) {
          alert(`Could not apply study: ${skipped.join(", ")}`);
        }
      }
    },
    [config, onConfigChange],
  );

  const handleSaveStudyTemplate = useCallback(
    (indicator: IndicatorConfig) => {
      const name = prompt("Study template name:");
      if (!name?.trim()) return;
      const preset = createStudyPreset(name.trim(), studyTemplateFromIndicator(indicator));
      const result = savePreset(preset);
      if (!result.ok) {
        alert("Template limit reached (50). Delete one to save a new template.");
      } else {
        bumpTemplateRevision();
      }
    },
    [bumpTemplateRevision],
  );

  const openChartTemplatePicker = useCallback(() => {
    setTemplatePickerTab("chart");
    setTemplatePickerOpen(true);
    setContextMenu(null);
  }, [setTemplatePickerOpen, setTemplatePickerTab, setContextMenu]);

  return {
    chartTemplates,
    handleSaveChartTemplate,
    handleApplyTemplate,
    handleSaveStudyTemplate,
    openChartTemplatePicker,
  };
}
