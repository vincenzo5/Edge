"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ButtonVisibility,
  ChartLineStyle,
  CrosshairMode,
  DrawingPriceLabelMode,
  GridLineMode,
  IndicatorPriceLabelMode,
  PricePrecision,
  PriceScalePlacement,
  PriceScaleType,
  RequiredChartSettings,
  StatusLineTitleMode,
  SymbolPriceLabelMode,
} from "@/lib/chartConfig";
import type { PresetEnvelope } from "@/lib/chart/presets/types";
import type { ChartSettings } from "@/lib/chartConfig";
import {
  DEFAULT_CHART_SETTINGS,
  mergeChartSettings,
} from "@/lib/chartConfig";
import { getChartColors } from "@/lib/chart/chartTheme";
import { buildTimeZoneMenuOptions } from "@/lib/chart/timeZone";

type Section = "symbol" | "status" | "scales" | "canvas" | "trading";
type ChartTemplatePreset = Extract<PresetEnvelope, { kind: "chart" }>;

type Props = {
  open: boolean;
  settings: ChartSettings | undefined;
  initialSection?: Section;
  onClose: () => void;
  onSave: (next: RequiredChartSettings) => void;
  chartTemplates?: ChartTemplatePreset[];
  onSaveTemplate?: (settingsDraft: RequiredChartSettings) => void;
  onApplyTemplate?: (preset: ChartTemplatePreset) => void;
};

const SECTIONS: { id: Section; label: string }[] = [
  { id: "symbol", label: "Symbol" },
  { id: "status", label: "Status line" },
  { id: "scales", label: "Scales and lines" },
  { id: "canvas", label: "Canvas" },
  { id: "trading", label: "Trading" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {title}
    </p>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="max-w-[180px] rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
          className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
      </span>
    </label>
  );
}

function ColorPairRow({
  label,
  upColor,
  downColor,
  upFallback,
  downFallback,
  onUpChange,
  onDownChange,
}: {
  label: string;
  upColor: string | null;
  downColor: string | null;
  upFallback: string;
  downFallback: string;
  onUpChange: (v: string | null) => void;
  onDownChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={upColor ?? upFallback}
          onChange={(e) => onUpChange(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
          title="Up color"
        />
        <input
          type="color"
          value={downColor ?? downFallback}
          onChange={(e) => onDownChange(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
          title="Down color"
        />
      </span>
    </div>
  );
}

function RadioRow({
  name,
  label,
  value,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
    </label>
  );
}

const PRICE_SCALE_OPTIONS: { value: PriceScaleType; label: string }[] = [
  { value: "linear", label: "Linear (auto)" },
  { value: "log", label: "Logarithmic" },
  { value: "percent", label: "Percent" },
  { value: "indexed", label: "Indexed to 100" },
];

const CROSSHAIR_OPTIONS: { value: CrosshairMode; label: string }[] = [
  { value: "cross", label: "Cross" },
  { value: "dot", label: "Dot" },
  { value: "arrow", label: "Arrow" },
];

const PRECISION_OPTIONS: { value: PricePrecision; label: string }[] = [
  { value: "default", label: "Default" },
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
];

const TITLE_MODE_OPTIONS: { value: StatusLineTitleMode; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "symbol", label: "Symbol" },
  { value: "description", label: "Description" },
];

const GRID_MODE_OPTIONS: { value: GridLineMode; label: string }[] = [
  { value: "both", label: "Vertical and horizontal" },
  { value: "vertical", label: "Vertical only" },
  { value: "horizontal", label: "Horizontal only" },
  { value: "none", label: "None" },
];

const LINE_STYLE_OPTIONS: { value: ChartLineStyle; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

const BUTTON_VISIBILITY_OPTIONS: { value: ButtonVisibility; label: string }[] = [
  { value: "always", label: "Always visible" },
  { value: "hover", label: "Visible on mouse over" },
  { value: "hidden", label: "Hidden" },
];

export default function ChartSettingsModal({
  open,
  settings,
  initialSection = "status",
  onClose,
  onSave,
  chartTemplates = [],
  onSaveTemplate,
  onApplyTemplate,
}: Props) {
  const merged = mergeChartSettings(settings);
  const [values, setValues] = useState(merged);
  const [section, setSection] = useState<Section>("status");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const themeColors = getChartColors("dark");

  useEffect(() => {
    setValues(mergeChartSettings(settings));
    setSection(initialSection);
    setTemplateMenuOpen(false);
  }, [settings, open, initialSection]);

  const setSymbol = useCallback(
    (patch: Partial<RequiredChartSettings["symbol"]>) => {
      setValues((prev) => ({ ...prev, symbol: { ...prev.symbol, ...patch } }));
    },
    [],
  );

  const setStatusLine = useCallback(
    (patch: Partial<RequiredChartSettings["statusLine"]>) => {
      setValues((prev) => ({ ...prev, statusLine: { ...prev.statusLine, ...patch } }));
    },
    [],
  );

  const setScales = useCallback(
    (patch: Partial<RequiredChartSettings["scales"]>) => {
      setValues((prev) => ({ ...prev, scales: { ...prev.scales, ...patch } }));
    },
    [],
  );

  const setCanvas = useCallback(
    (patch: Partial<RequiredChartSettings["canvas"]>) => {
      setValues((prev) => ({ ...prev, canvas: { ...prev.canvas, ...patch } }));
    },
    [],
  );

  const setTrading = useCallback(
    (patch: Partial<RequiredChartSettings["trading"]>) => {
      setValues((prev) => ({ ...prev, trading: { ...prev.trading, ...patch } }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    onSave(values);
    onClose();
  }, [onClose, onSave, values]);

  const handleReset = useCallback(() => {
    setValues({ ...DEFAULT_CHART_SETTINGS });
  }, []);

  const handleSaveTemplate = useCallback(() => {
    onSaveTemplate?.(values);
    setTemplateMenuOpen(false);
  }, [onSaveTemplate, values]);

  const handleApplyTemplate = useCallback(
    (preset: ChartTemplatePreset) => {
      onApplyTemplate?.(preset);
      setTemplateMenuOpen(false);
    },
    [onApplyTemplate],
  );

  if (!open) return null;

  const timeZoneOptions = buildTimeZoneMenuOptions().map((opt) => ({
    value: opt.id,
    label: opt.label,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-base font-semibold">Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-[380px] flex-1 overflow-hidden">
          <nav className="flex w-44 shrink-0 flex-col border-r border-gray-200 bg-gray-50 py-2 dark:border-gray-700 dark:bg-gray-950">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`px-3 py-2 text-left text-sm ${
                  section === s.id
                    ? "bg-white font-medium text-blue-600 dark:bg-gray-900 dark:text-blue-400"
                    : "text-gray-600 hover:bg-white/80 dark:text-gray-400 dark:hover:bg-gray-900/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {section === "symbol" && (
              <>
                <SectionHeader title="Candles" />
                <ToggleRow
                  label="Color bars based on previous close"
                  checked={values.symbol.colorBarsByPreviousClose}
                  onChange={(v) => setSymbol({ colorBarsByPreviousClose: v })}
                />
                <ToggleRow
                  label="Body"
                  checked={values.symbol.showBody}
                  onChange={(v) => setSymbol({ showBody: v })}
                />
                <ColorPairRow
                  label="Body colors"
                  upColor={values.symbol.bodyUpColor}
                  downColor={values.symbol.bodyDownColor}
                  upFallback={themeColors.up}
                  downFallback={themeColors.down}
                  onUpChange={(v) => setSymbol({ bodyUpColor: v })}
                  onDownChange={(v) => setSymbol({ bodyDownColor: v })}
                />
                <ToggleRow
                  label="Borders"
                  checked={values.symbol.showBorders}
                  onChange={(v) => setSymbol({ showBorders: v })}
                />
                <ColorPairRow
                  label="Border colors"
                  upColor={values.symbol.borderUpColor}
                  downColor={values.symbol.borderDownColor}
                  upFallback={themeColors.up}
                  downFallback={themeColors.down}
                  onUpChange={(v) => setSymbol({ borderUpColor: v })}
                  onDownChange={(v) => setSymbol({ borderDownColor: v })}
                />
                <ToggleRow
                  label="Wick"
                  checked={values.symbol.showWicks}
                  onChange={(v) => setSymbol({ showWicks: v })}
                />
                <ColorPairRow
                  label="Wick colors"
                  upColor={values.symbol.wickUpColor}
                  downColor={values.symbol.wickDownColor}
                  upFallback={themeColors.wick}
                  downFallback={themeColors.wick}
                  onUpChange={(v) => setSymbol({ wickUpColor: v })}
                  onDownChange={(v) => setSymbol({ wickDownColor: v })}
                />

                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Data modification" />
                  <SelectRow
                    label="Precision"
                    value={String(values.symbol.precision)}
                    options={PRECISION_OPTIONS.map((opt) => ({
                      value: String(opt.value),
                      label: opt.label,
                    }))}
                    onChange={(v) =>
                      setSymbol({
                        precision: (v === 'default' ? 'default' : Number(v)) as PricePrecision,
                      })
                    }
                  />
                  <SelectRow
                    label="Timezone"
                    value={values.symbol.timeZone}
                    options={timeZoneOptions}
                    onChange={(v) => setSymbol({ timeZone: v })}
                  />
                </div>
              </>
            )}

            {section === "status" && (
              <>
                <SectionHeader title="Instrument" />
                <ToggleRow
                  label="Logo"
                  checked={values.statusLine.showLogo}
                  onChange={(v) => setStatusLine({ showLogo: v })}
                />
                <ToggleRow
                  label="Title"
                  checked={values.statusLine.showTitle}
                  onChange={(v) => setStatusLine({ showTitle: v })}
                />
                <SelectRow
                  label="Title mode"
                  value={values.statusLine.titleMode}
                  options={TITLE_MODE_OPTIONS}
                  onChange={(v) => setStatusLine({ titleMode: v })}
                />
                <ToggleRow
                  label="Open market status"
                  checked={values.statusLine.showMarketStatus}
                  onChange={(v) => setStatusLine({ showMarketStatus: v })}
                />
                <ToggleRow
                  label="Chart values (OHLC)"
                  checked={values.statusLine.showChartValues}
                  onChange={(v) => setStatusLine({ showChartValues: v })}
                />
                <ToggleRow
                  label="Bar change values"
                  checked={values.statusLine.showBarChangeValues}
                  onChange={(v) => setStatusLine({ showBarChangeValues: v })}
                />
                <ToggleRow
                  label="Volume"
                  checked={values.statusLine.showVolume}
                  onChange={(v) => setStatusLine({ showVolume: v })}
                />
                <ToggleRow
                  label="Last day change values"
                  checked={values.statusLine.showLastDayChange}
                  onChange={(v) => setStatusLine({ showLastDayChange: v })}
                />

                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Indicators" />
                  <ToggleRow
                    label="Titles"
                    checked={values.statusLine.indicatorShowTitles}
                    onChange={(v) => setStatusLine({ indicatorShowTitles: v })}
                  />
                  <ToggleRow
                    label="Inputs"
                    checked={values.statusLine.indicatorShowInputs}
                    onChange={(v) => setStatusLine({ indicatorShowInputs: v })}
                  />
                  <ToggleRow
                    label="Values"
                    checked={values.statusLine.indicatorShowValues}
                    onChange={(v) => setStatusLine({ indicatorShowValues: v })}
                  />
                  <NumberRow
                    label="Background opacity"
                    value={values.statusLine.indicatorBackgroundOpacity}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => setStatusLine({ indicatorBackgroundOpacity: v })}
                  />
                </div>
              </>
            )}

            {section === "scales" && (
              <>
                <ToggleRow
                  label="Price scale"
                  checked={values.scales.showPriceScale}
                  onChange={(v) => setScales({ showPriceScale: v })}
                />
                <ToggleRow
                  label="Time scale"
                  checked={values.scales.showTimeScale}
                  onChange={(v) => setScales({ showTimeScale: v })}
                />
                <SelectRow
                  label="Scales placement"
                  value={values.scales.priceScalePlacement}
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "right", label: "Right" },
                    { value: "left", label: "Left" },
                  ] satisfies { value: PriceScalePlacement; label: string }[]}
                  onChange={(v) => setScales({ priceScalePlacement: v })}
                />
                <ToggleRow
                  label="Invert scale"
                  checked={values.scales.invertPriceScale}
                  onChange={(v) => setScales({ invertPriceScale: v })}
                />
                <ToggleRow
                  label="Scale price chart only"
                  checked={values.scales.scalePriceChartOnly}
                  onChange={(v) => setScales({ scalePriceChartOnly: v })}
                />

                <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Price scale type" />
                  {PRICE_SCALE_OPTIONS.map((opt) => (
                    <RadioRow
                      key={opt.value}
                      name="priceScaleType"
                      label={opt.label}
                      value={opt.value}
                      checked={values.scales.priceScaleType === opt.value}
                      onChange={() => setScales({ priceScaleType: opt.value })}
                    />
                  ))}
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Price labels & lines" />
                  <ToggleRow
                    label="No overlapping labels"
                    checked={values.scales.noOverlappingPriceLabels}
                    onChange={(v) => setScales({ noOverlappingPriceLabels: v })}
                  />
                  <ToggleRow
                    label="Plus button"
                    checked={values.scales.showPricePlusButton}
                    onChange={(v) => setScales({ showPricePlusButton: v })}
                  />
                  <ToggleRow
                    label="Countdown to bar close"
                    checked={values.scales.showCountdownToBarClose}
                    onChange={(v) => setScales({ showCountdownToBarClose: v })}
                  />
                  <SelectRow
                    label="Symbol"
                    value={values.scales.symbolPriceLabelMode}
                    options={[
                      { value: "hidden", label: "Hidden" },
                      { value: "value", label: "Value" },
                      { value: "line", label: "Line" },
                      { value: "valueLine", label: "Value and line" },
                    ] satisfies { value: SymbolPriceLabelMode; label: string }[]}
                    onChange={(v) => setScales({ symbolPriceLabelMode: v })}
                  />
                  <SelectRow
                    label="Indicators and financials"
                    value={values.scales.indicatorPriceLabelMode}
                    options={[
                      { value: "hidden", label: "Hidden" },
                      { value: "nameValue", label: "Name and value" },
                      { value: "valueOnly", label: "Value only" },
                    ] satisfies { value: IndicatorPriceLabelMode; label: string }[]}
                    onChange={(v) => setScales({ indicatorPriceLabelMode: v })}
                  />
                  <SelectRow
                    label="Drawings"
                    value={values.scales.drawingPriceLabels}
                    options={[
                      { value: "hidden", label: "Hidden" },
                      { value: "visible", label: "Name, value" },
                    ] satisfies { value: DrawingPriceLabelMode; label: string }[]}
                    onChange={(v) => setScales({ drawingPriceLabels: v })}
                  />
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Scales appearance" />
                  <NumberRow
                    label="Text size"
                    value={values.scales.axisTextSize}
                    min={8}
                    max={16}
                    onChange={(v) => setScales({ axisTextSize: v })}
                  />
                </div>
              </>
            )}

            {section === "canvas" && (
              <>
                <SectionHeader title="Chart basic styles" />
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Background</span>
                  <input
                    type="color"
                    value={values.canvas.backgroundColor ?? "#0A0B0E"}
                    onChange={(e) => setCanvas({ backgroundColor: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                </label>
                <ToggleRow
                  label="Grid lines"
                  checked={values.canvas.showGrid}
                  onChange={(v) => setCanvas({ showGrid: v })}
                />
                <SelectRow
                  label="Grid orientation"
                  value={values.canvas.gridMode}
                  options={GRID_MODE_OPTIONS}
                  onChange={(v) => setCanvas({ gridMode: v })}
                />
                <SelectRow
                  label="Grid line style"
                  value={values.canvas.gridLineStyle}
                  options={LINE_STYLE_OPTIONS}
                  onChange={(v) => setCanvas({ gridLineStyle: v })}
                />
                <NumberRow
                  label="Grid opacity"
                  value={values.canvas.gridOpacity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => setCanvas({ gridOpacity: v })}
                />
                <ToggleRow
                  label="Crosshair"
                  checked={values.canvas.showCrosshair}
                  onChange={(v) => setCanvas({ showCrosshair: v })}
                />
                <SelectRow
                  label="Crosshair line style"
                  value={values.canvas.crosshairLineStyle}
                  options={LINE_STYLE_OPTIONS}
                  onChange={(v) => setCanvas({ crosshairLineStyle: v })}
                />
                <ToggleRow
                  label="Watermark"
                  checked={values.canvas.watermarkVisible}
                  onChange={(v) => setCanvas({ watermarkVisible: v })}
                />

                <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Crosshair mode" />
                  {CROSSHAIR_OPTIONS.map((opt) => (
                    <RadioRow
                      key={opt.value}
                      name="crosshairMode"
                      label={opt.label}
                      value={opt.value}
                      checked={values.canvas.crosshairMode === opt.value}
                      onChange={() => setCanvas({ crosshairMode: opt.value })}
                    />
                  ))}
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Buttons" />
                  <SelectRow
                    label="Navigation"
                    value={values.canvas.navigationButtons}
                    options={BUTTON_VISIBILITY_OPTIONS}
                    onChange={(v) => setCanvas({ navigationButtons: v })}
                  />
                  <SelectRow
                    label="Pane"
                    value={values.canvas.paneButtons}
                    options={BUTTON_VISIBILITY_OPTIONS}
                    onChange={(v) => setCanvas({ paneButtons: v })}
                  />
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <SectionHeader title="Margins" />
                  <NumberRow
                    label="Top"
                    value={values.canvas.marginTopPercent}
                    min={0}
                    max={50}
                    unit="%"
                    onChange={(v) => setCanvas({ marginTopPercent: v })}
                  />
                  <NumberRow
                    label="Bottom"
                    value={values.canvas.marginBottomPercent}
                    min={0}
                    max={50}
                    unit="%"
                    onChange={(v) => setCanvas({ marginBottomPercent: v })}
                  />
                  <NumberRow
                    label="Right"
                    value={values.canvas.marginRightBars}
                    min={0}
                    max={100}
                    unit="bars"
                    onChange={(v) => setCanvas({ marginRightBars: v })}
                  />
                </div>
              </>
            )}

            {section === "trading" && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Display preferences for future trading overlays. No broker integration in this
                  release.
                </p>
                <ToggleRow
                  label="Buy/Sell buttons"
                  checked={values.trading.showBuySellButtons}
                  onChange={(v) => setTrading({ showBuySellButtons: v })}
                />
                <ToggleRow
                  label="Orders"
                  checked={values.trading.showOrders}
                  onChange={(v) => setTrading({ showOrders: v })}
                />
                <ToggleRow
                  label="Positions"
                  checked={values.trading.showPositions}
                  onChange={(v) => setTrading({ showPositions: v })}
                />
                <ToggleRow
                  label="Executions"
                  checked={values.trading.showExecutions}
                  onChange={(v) => setTrading({ showExecutions: v })}
                />
                <ToggleRow
                  label="Profit & loss"
                  checked={values.trading.showPnL}
                  onChange={(v) => setTrading({ showPnL: v })}
                />
              </>
            )}

          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Reset to defaults
            </button>
            {(onSaveTemplate || onApplyTemplate) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplateMenuOpen((prev) => !prev)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-haspopup="menu"
                  aria-expanded={templateMenuOpen}
                >
                  Templates ▾
                </button>
                {templateMenuOpen && (
                  <div
                    role="menu"
                    className="absolute bottom-full left-0 z-10 mb-2 w-56 overflow-hidden rounded border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                  >
                    {onSaveTemplate && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSaveTemplate}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Save current as template…
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleReset();
                        setTemplateMenuOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Apply defaults
                    </button>
                    {onApplyTemplate && (
                      <>
                        <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                        {chartTemplates.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No saved templates
                          </div>
                        ) : (
                          chartTemplates.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              role="menuitem"
                              onClick={() => handleApplyTemplate(preset)}
                              className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              {preset.name}
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Section as ChartSettingsSection };
