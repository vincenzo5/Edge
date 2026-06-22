import type { ContextMenuItem } from "./ContextMenu";
import type {
  ChartSettings,
  IndicatorPriceLabelMode,
  PriceScalePlacement,
  PriceScaleType,
  RequiredChartSettings,
  SymbolPriceLabelMode,
} from "@/lib/chart/chartSettings";

export type ChartContextMenuState = {
  viewportModified: boolean;
  drawingCount: number;
  indicatorCount: number;
  priceLabel: string | null;
  canPasteDrawings: boolean;
};

export type ChartContextMenuActions = {
  resetView: () => void;
  copyPrice: (price: string) => void;
  openObjectTree: () => void;
  openSettings: () => void;
  openGoTo: () => void;
  pasteDrawings: () => void;
  saveChartTemplate: () => void;
  applyChartTemplate: () => void;
  removeDrawings: () => void;
  removeIndicators: () => void;
};

function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `Remove 1 ${singular}` : `Remove ${count} ${plural}`;
}

export function buildChartContextMenuItems(
  state: ChartContextMenuState,
  actions: ChartContextMenuActions,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: "reset-view",
      label: "Reset chart view",
      disabled: !state.viewportModified,
      action: actions.resetView,
      dividerAfter: true,
    },
    {
      id: "go-to-date",
      label: "Go to date…",
      shortcut: "⌥G",
      action: actions.openGoTo,
      dividerAfter: true,
    },
  ];

  if (state.priceLabel) {
    items.push({
      id: "copy-price",
      label: `Copy price ${state.priceLabel}`,
      action: () => actions.copyPrice(state.priceLabel!),
      dividerAfter: true,
    });
  }

  items.push({
    id: "object-tree",
    label: "Object tree",
    action: actions.openObjectTree,
    dividerAfter: true,
  });

  if (state.canPasteDrawings) {
    items.push({
      id: "paste-drawings",
      label: "Paste",
      shortcut: "⌘V",
      action: actions.pasteDrawings,
      dividerAfter: state.drawingCount > 0 || state.indicatorCount > 0,
    });
  } else if (state.drawingCount === 0 && state.indicatorCount === 0) {
    items[items.length - 1].dividerAfter = false;
  }

  if (state.drawingCount > 0) {
    items.push({
      id: "remove-drawings",
      label: countLabel(state.drawingCount, "drawing", "drawings"),
      danger: true,
      action: actions.removeDrawings,
      dividerAfter: true,
    });
  }

  if (state.indicatorCount > 0) {
    items.push({
      id: "remove-indicators",
      label: countLabel(state.indicatorCount, "indicator", "indicators"),
      danger: true,
      action: actions.removeIndicators,
      dividerAfter: true,
    });
  }

  items.push({
    id: "settings",
    label: "Settings…",
    action: actions.openSettings,
    dividerAfter: true,
  });

  items.push({
    id: "save-chart-template",
    label: "Save chart template…",
    action: actions.saveChartTemplate,
  });

  items.push({
    id: "apply-chart-template",
    label: "Apply chart template…",
    action: actions.applyChartTemplate,
  });

  return items;
}

export type PriceScaleContextMenuState = {
  settings: RequiredChartSettings;
  priceScaleMode: "auto" | "manual";
};

export type PriceScaleContextMenuActions = {
  resetPriceScale: () => void;
  setPriceScaleType: (type: PriceScaleType) => void;
  openScaleSettings: () => void;
  patchSettings: (patch: ChartSettings) => void;
};

const SCALE_TYPE_LABELS: Record<PriceScaleType, string> = {
  linear: "Auto (fits data to screen)",
  log: "Logarithmic",
  percent: "Percent",
  indexed: "Indexed to 100",
};

const SYMBOL_LABEL_OPTIONS: { value: SymbolPriceLabelMode; label: string }[] = [
  { value: "hidden", label: "Hidden" },
  { value: "value", label: "Value" },
  { value: "line", label: "Line" },
  { value: "valueLine", label: "Value and line" },
];

const INDICATOR_LABEL_OPTIONS: { value: IndicatorPriceLabelMode; label: string }[] = [
  { value: "hidden", label: "Hidden" },
  { value: "nameValue", label: "Name and value" },
  { value: "valueOnly", label: "Value only" },
];

function checked(active: boolean): string {
  return active ? "✓ " : "";
}

function buildSymbolLabelItems(
  settings: RequiredChartSettings,
  patchSettings: PriceScaleContextMenuActions["patchSettings"],
): ContextMenuItem[] {
  return SYMBOL_LABEL_OPTIONS.map((opt) => ({
    id: `symbol-label-${opt.value}`,
    label: `${checked(settings.scales.symbolPriceLabelMode === opt.value)}${opt.label}`,
    action: () => patchSettings({ scales: { symbolPriceLabelMode: opt.value } }),
  }));
}

function buildIndicatorLabelItems(
  settings: RequiredChartSettings,
  patchSettings: PriceScaleContextMenuActions["patchSettings"],
): ContextMenuItem[] {
  return INDICATOR_LABEL_OPTIONS.map((opt) => ({
    id: `indicator-label-${opt.value}`,
    label: `${checked(settings.scales.indicatorPriceLabelMode === opt.value)}${opt.label}`,
    action: () => patchSettings({ scales: { indicatorPriceLabelMode: opt.value } }),
  }));
}

function buildLinesSubmenu(
  settings: RequiredChartSettings,
  patchSettings: PriceScaleContextMenuActions["patchSettings"],
): ContextMenuItem[] {
  const mode = settings.scales.symbolPriceLabelMode;
  const symbolLineOn = mode === "line" || mode === "valueLine";
  return [
    {
      id: "line-symbol",
      label: `${checked(symbolLineOn)}Symbol price line`,
      action: () => {
        const next: SymbolPriceLabelMode = symbolLineOn
          ? mode === "valueLine"
            ? "value"
            : "hidden"
          : mode === "value"
            ? "valueLine"
            : "line";
        patchSettings({ scales: { symbolPriceLabelMode: next } });
      },
    },
    {
      id: "line-drawings",
      label: `${checked(settings.scales.drawingPriceLabels === "visible")}Drawing price lines`,
      action: () =>
        patchSettings({
          scales: {
            drawingPriceLabels:
              settings.scales.drawingPriceLabels === "visible" ? "hidden" : "visible",
          },
        }),
    },
  ];
}

export function buildPriceScaleContextMenuItems(
  state: PriceScaleContextMenuState,
  actions: PriceScaleContextMenuActions,
): ContextMenuItem[] {
  const { settings } = state;
  const scales = settings.scales;
  const types: PriceScaleType[] = ["linear", "log", "percent", "indexed"];

  const items: ContextMenuItem[] = [
    {
      id: "auto-scale",
      label: `${checked(state.priceScaleMode === "auto")}Auto (fits data to screen)`,
      action: actions.resetPriceScale,
      dividerAfter: true,
    },
    {
      id: "scale-price-only",
      label: `${checked(scales.scalePriceChartOnly)}Scale price chart only`,
      action: () =>
        actions.patchSettings({
          scales: { scalePriceChartOnly: !scales.scalePriceChartOnly },
        }),
      dividerAfter: true,
    },
    {
      id: "invert-scale",
      label: `${checked(scales.invertPriceScale)}Invert scale`,
      shortcut: "⌥I",
      action: () =>
        actions.patchSettings({ scales: { invertPriceScale: !scales.invertPriceScale } }),
      dividerAfter: true,
    },
  ];

  items.push({
    id: "scale-regular",
    label: `${checked(scales.priceScaleType === "linear")}Regular`,
    action: () => actions.setPriceScaleType("linear"),
  });

  for (const type of types.filter((t) => t !== "linear")) {
    items.push({
      id: `scale-${type}`,
      label: `${checked(scales.priceScaleType === type)}${SCALE_TYPE_LABELS[type]}`,
      action: () => actions.setPriceScaleType(type),
      dividerAfter: type === "indexed",
    });
  }

  const placementLabel =
    scales.priceScalePlacement === "left" ? "Move scale to right" : "Move scale to left";
  items.push({
    id: "move-scale",
    label: placementLabel,
    action: () => {
      const next: PriceScalePlacement =
        scales.priceScalePlacement === "left" ? "right" : "left";
      actions.patchSettings({ scales: { priceScalePlacement: next } });
    },
    dividerAfter: true,
  });

  items.push({
    id: "labels-submenu",
    label: "Labels",
    action: () => {},
    children: [
      ...buildSymbolLabelItems(settings, actions.patchSettings).map((item, i, arr) =>
        i === arr.length - 1 ? { ...item, dividerAfter: true } : item,
      ),
      ...buildIndicatorLabelItems(settings, actions.patchSettings).map((item, i, arr) =>
        i === arr.length - 1 ? { ...item, dividerAfter: true } : item,
      ),
      {
        id: "labels-countdown",
        label: `${checked(scales.showCountdownToBarClose)}Countdown to bar close`,
        action: () =>
          actions.patchSettings({
            scales: { showCountdownToBarClose: !scales.showCountdownToBarClose },
          }),
      },
      {
        id: "labels-no-overlap",
        label: `${checked(scales.noOverlappingPriceLabels)}No overlapping labels`,
        action: () =>
          actions.patchSettings({
            scales: { noOverlappingPriceLabels: !scales.noOverlappingPriceLabels },
          }),
      },
    ],
  });

  items.push({
    id: "lines-submenu",
    label: "Lines",
    action: () => {},
    children: buildLinesSubmenu(settings, actions.patchSettings),
    dividerAfter: true,
  });

  items.push({
    id: "plus-button",
    label: `${checked(scales.showPricePlusButton)}Plus button`,
    action: () =>
      actions.patchSettings({ scales: { showPricePlusButton: !scales.showPricePlusButton } }),
    dividerAfter: true,
  });

  items.push({
    id: "more-scale-settings",
    label: "More settings…",
    action: actions.openScaleSettings,
  });

  return items;
}
