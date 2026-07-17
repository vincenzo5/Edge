import type { ReactNode } from "react";
import { getCatalogEntry } from "@/lib/chart/indicators/registry";
import { resolveIndicatorLegend, resolvePriceLegend } from "@/lib/chart/legend";
import { mergeChartSettings, patchChartSettings } from "@/lib/chart/chartSettings";
import type { CellConfig } from "@/lib/chartConfig";
import { IndicatorRegistry } from "@/lib/chart/pluginHost";
import { formatCrosshairTime } from "@/lib/chart/timeAxis";
import { formatObjectTreeSymbolLine } from "@/lib/chart/objectTreeModel";
import type { ActiveChartDataWindowActions } from "../ActiveChartContext";
import {
  EyeIcon,
  EyeOffIcon,
} from "../chart-icons/ChartToolIcons";
import { HoverIconButton, ICON_SIZE } from "./HoverIconButton";
import type { DataWindowProps } from "./types";

export type { DataWindowProps };

function formatSymbolLine(
  symbol: string,
  interval: CellConfig["interval"],
  exchange?: string,
): string {
  return formatObjectTreeSymbolLine(symbol, interval, exchange);
}

export function DataWindowTab({
  dataWindow,
  dataWindowActions,
}: {
  dataWindow?: DataWindowProps;
  dataWindowActions?: ActiveChartDataWindowActions;
}) {
  if (!dataWindow || dataWindow.candles.length === 0) {
    return (
      <div className="px-2 py-2 text-xs italic text-[var(--edge-text-muted)]">
        Hover over the chart to see values.
      </div>
    );
  }

  const settings = mergeChartSettings(dataWindow.chartSettings);
  const dataWindowChartSettings = patchChartSettings(dataWindow.chartSettings, {
    statusLine: {
      indicatorShowValues: true,
    },
  });
  const mainVisible = dataWindow.mainSeriesVisible !== false;
  const index =
    dataWindow.dataIndex != null &&
    dataWindow.dataIndex >= 0 &&
    dataWindow.dataIndex < dataWindow.candles.length
      ? dataWindow.dataIndex
      : dataWindow.candles.length - 1;
  const candle = dataWindow.candles[index];
  const dateLabel = candle
    ? formatCrosshairTime(candle.t, dataWindow.interval)
    : "";

  const priceSections = mainVisible
    ? resolvePriceLegend({
        symbol: dataWindow.symbol,
        symbolName: dataWindow.symbolName,
        exchange: dataWindow.exchange,
        interval: dataWindow.interval,
        candles: dataWindow.candles,
        dataIndex: dataWindow.dataIndex,
        chartSettings: dataWindow.chartSettings,
      })
    : null;

  const ohlcRows =
    priceSections
      ?.filter((s) => s.kind === "value" && s.id !== "volume" && s.id !== "change")
      .map((s) =>
        s.kind === "value"
          ? { id: s.id, label: s.label, value: s.value, color: s.color }
          : null,
      )
      .filter(Boolean) as Array<{
      id: string;
      label: string;
      value: string;
      color?: string;
    }> | undefined;

  const changeRow = priceSections?.find((s) => s.kind === "value" && s.id === "change");

  const volIndicator = dataWindow.indicators.find((i) => i.name === "VOL");
  const volumeVisible = volIndicator?.visible !== false;

  let volumeRows: Array<{ id: string; label: string; value: string; color?: string }> = [];
  if (volIndicator && IndicatorRegistry.get("VOL")) {
    const volSections = resolveIndicatorLegend(
      volIndicator,
      dataWindow.candles,
      dataWindow.dataIndex,
      dataWindow.theme,
      dataWindowChartSettings,
    );
    const volValues = volSections?.filter((s) => s.kind === "value") ?? [];
    volumeRows = volValues.map((s, i) =>
      s.kind === "value"
        ? { id: `vol-${i}`, label: s.label, value: s.value, color: s.color }
        : { id: `vol-${i}`, label: "", value: "" },
    );
  }

  const indicatorBlocks = dataWindow.indicators
    .filter((ind) => ind.visible !== false)
    .map((ind) => {
      if (!IndicatorRegistry.get(ind.name)) return null;
      const sections = resolveIndicatorLegend(
        ind,
        dataWindow.candles,
        dataWindow.dataIndex,
        dataWindow.theme,
        dataWindowChartSettings,
      );
      if (!sections) return null;
      const values = sections.filter((s) => s.kind === "value");
      if (values.length === 0) return null;
      const titleSection = sections.find((s) => s.kind === "text");
      const title =
        titleSection?.kind === "text" ? titleSection.text : ind.name;
      return { id: ind.id, name: ind.name, title, values, visible: true };
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    title: string;
    values: Array<{ label: string; value: string; color?: string }>;
    visible: boolean;
  }>;

  const displayName = dataWindow.symbolName ?? dataWindow.symbol;
  const priceHeader = formatSymbolLine(
    displayName,
    dataWindow.interval,
    dataWindow.exchange,
  );

  return (
    <div className="space-y-1 px-2 py-1.5 text-[11px]">
      {dateLabel && (
        <div className="pb-1 text-xs text-[var(--edge-text-primary)]">
          {dateLabel}
        </div>
      )}
      {dataWindow.dataMeta?.source && (
        <div className="pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
          Source: {dataWindow.dataMeta.source}
          {dataWindow.dataMeta.streaming ? ' · live' : ''}
          {dataWindow.dataMeta.stale ? ' · stale' : ''}
          {dataWindow.dataMeta.warnings && dataWindow.dataMeta.warnings.length > 0
            ? ` · ${dataWindow.dataMeta.warnings[0]}`
            : ''}
        </div>
      )}

      <DataWindowSectionHeader
        title={priceHeader}
        visible={mainVisible}
        visibilityLabel="price series"
        onToggleVisible={(visible) => dataWindowActions?.setPriceVisible(visible)}
      />
      <CollapsibleSection visible={mainVisible}>
        {(ohlcRows?.length ?? 0) > 0 && <ValueGrid rows={ohlcRows!} />}
        {changeRow?.kind === "value" && settings.statusLine.showBarChangeValues && (
          <ValueGrid
            rows={[
              {
                id: "change",
                label: changeRow.label || "Chg",
                value: changeRow.value,
                color: changeRow.color,
              },
            ]}
          />
        )}
      </CollapsibleSection>

      {volIndicator && (
        <>
          <DataWindowSectionHeader
            title="Volume"
            visible={volumeVisible}
            visibilityLabel="volume"
            onToggleVisible={(visible) => dataWindowActions?.setVolumeVisible(visible)}
          />
          <CollapsibleSection visible={volumeVisible}>
            {volumeRows.length > 0 && <ValueGrid rows={volumeRows} />}
          </CollapsibleSection>
        </>
      )}

      {dataWindow.indicators
        .filter((ind) => ind.name !== "VOL")
        .map((ind) => {
          const block = indicatorBlocks.find((b) => b.id === ind.id);
          const isVisible = ind.visible !== false;
          const fallbackTitle = getCatalogEntry(ind.name)?.description ?? ind.name;
          return (
            <div key={ind.id}>
              <DataWindowSectionHeader
                title={block?.title ?? fallbackTitle}
                visible={isVisible}
                visibilityLabel={ind.name}
                onToggleVisible={(visible) =>
                  dataWindowActions?.setIndicatorVisible(ind.id, visible)
                }
              />
              <CollapsibleSection visible={isVisible}>
                {block && (
                  <ValueGrid
                    rows={block.values.map((v, i) => ({
                      id: `${ind.id}-${i}`,
                      label: v.label,
                      value: v.value,
                      color: v.color,
                    }))}
                  />
                )}
              </CollapsibleSection>
            </div>
          );
        })}
    </div>
  );
}

function CollapsibleSection({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  if (!visible) {
    return (
      <div
        aria-hidden
        className="h-0 overflow-hidden"
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

function DataWindowSectionHeader({
  title,
  visible,
  onToggleVisible,
  visibilityLabel,
}: {
  title: string;
  visible: boolean;
  onToggleVisible?: (visible: boolean) => void;
  visibilityLabel?: string;
}) {
  const toggleTitle = visible
    ? `Hide ${visibilityLabel ?? title}`
    : `Show ${visibilityLabel ?? title}`;
  return (
    <div className="group flex items-center gap-1 py-0.5">
      <span className="min-w-0 flex-1 truncate font-medium text-[var(--edge-text-secondary)]">
        {title}
      </span>
      {onToggleVisible && (
        <div className="opacity-0 group-hover:opacity-100">
          <HoverIconButton
            title={toggleTitle}
            onClick={() => onToggleVisible(!visible)}
          >
            {visible ? (
              <EyeIcon size={ICON_SIZE} aria-hidden />
            ) : (
              <EyeOffIcon size={ICON_SIZE} aria-hidden />
            )}
          </HoverIconButton>
        </div>
      )}
    </div>
  );
}

function ValueGrid({
  rows,
}: {
  rows: Array<{ id: string; label: string; value: string; color?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pb-1 font-mono tabular-nums">
      {rows.map((row) => (
        <div key={row.id} className="flex justify-between gap-1">
          <span className="text-[var(--edge-text-muted)]">{row.label || row.id}</span>
          <span
            style={row.color ? { color: row.color } : undefined}
            className="text-[var(--edge-text-strong)]"
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
