'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChartType, LayoutTemplateId, Theme, LayoutSyncPrefs } from '@/lib/chartConfig';
import type { Interval } from '@/lib/chart/contracts';
import { loadIndicatorFavorites } from '@/lib/chart/indicatorFavorites';
import { resolveHeaderDensity, type HeaderDensity } from '@/lib/responsive/responsiveLayout';
import { useElementSize } from '@/lib/responsive/useElementSize';
import { getShortcutLabel } from '@/lib/shortcuts/formatShortcutLabel';
import { useActiveChart } from '../ActiveChartContext';
import { useShortcutUI } from '../shortcuts/ShortcutUIContext';
import SearchBar from '../SearchBar';
import ChartHeaderDivider from './ChartHeaderDivider';
import ChartHeaderButton from './ChartHeaderButton';
import ChartIntervalMenu from './ChartIntervalMenu';
import ChartTypeMenu from './ChartTypeMenu';
import ChartIndicatorFavoritesMenu from './ChartIndicatorFavoritesMenu';
import ChartTemplateMenu from './ChartTemplateMenu';
import ChartLayoutMenu from './ChartLayoutMenu';
import ChartSnapshotMenu from './ChartSnapshotMenu';
import ChartFullscreenButton from './ChartFullscreenButton';
import ChartHeaderMoreMenu from './ChartHeaderMoreMenu';
import SymbolNavArrows from './SymbolNavArrows';
import { headerBarClass } from './headerStyles';
import {
  IndicatorsIcon,
  QuickSearchIcon,
  RedoIcon,
  ReplayIcon,
  SettingsIcon,
  UndoIcon,
} from './ChartHeaderIcons';

type SymbolResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export type ChartHeaderLayoutState = {
  layoutName: string;
  layoutId: LayoutTemplateId;
  linkSymbol: boolean;
  linkInterval: boolean;
  linkCrosshair: boolean;
  linkDrawings: boolean;
  theme: Theme;
};

export type ChartHeaderLayoutActions = {
  onLayoutChange: (layoutId: LayoutTemplateId) => void;
  onLayoutSyncChange: (patch: Partial<LayoutSyncPrefs>) => void;
};

export type ChartHeaderChartState = {
  symbol: string;
  interval: Interval;
  chartType: ChartType;
  indicatorFavorites?: string[];
};

export type ChartHeaderChartActions = {
  onSymbolSelect: (result: SymbolResult) => void;
  onIntervalChange: (interval: Interval) => void;
  onChartTypeChange: (chartType: ChartType) => void;
};

export type ChartHeaderSymbolNav = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
};

export type ChartHeaderWorkspaceActions = {
  onRenameLayout?: () => void;
};

type Props = {
  layout: ChartHeaderLayoutState;
  chart: ChartHeaderChartState;
  layoutActions: ChartHeaderLayoutActions;
  chartActions: ChartHeaderChartActions;
  symbolNav?: ChartHeaderSymbolNav;
  workspaceActions?: ChartHeaderWorkspaceActions;
  onOpenTrade?: () => void;
  onOpenAlert?: () => void;
  /** Optional density override for tests. */
  density?: HeaderDensity;
};

function showInline(density: HeaderDensity, tier: 'primary' | 'secondary' | 'tertiary'): boolean {
  if (tier === 'primary') return density !== 'minimal';
  if (tier === 'secondary') return density === 'full';
  return density === 'full';
}

export default function ChartHeaderBar({
  layout,
  chart,
  layoutActions,
  chartActions,
  symbolNav,
  workspaceActions,
  onOpenTrade,
  onOpenAlert,
  density: densityOverride,
}: Props) {
  const { theme, layoutId, linkSymbol, linkInterval, linkCrosshair, linkDrawings, layoutName } = layout;
  const { symbol, interval, chartType, indicatorFavorites } = chart;
  const activeChart = useActiveChart();
  const commands = activeChart?.headerCommands;
  const { getCommandPalette, getSymbolSearch } = useShortcutUI();
  const [headerRef, headerSize] = useElementSize<HTMLDivElement>();
  const density =
    densityOverride ??
    resolveHeaderDensity(headerSize.width > 0 ? headerSize.width : 1440);

  const [favorites, setFavorites] = useState<string[]>(
    indicatorFavorites && indicatorFavorites.length > 0 ? indicatorFavorites : [],
  );

  useEffect(() => {
    if (indicatorFavorites && indicatorFavorites.length > 0) {
      setFavorites(indicatorFavorites);
      return;
    }
    setFavorites(loadIndicatorFavorites());
  }, [indicatorFavorites]);

  const moreItems = useMemo(() => {
    const items = [];

    if (!showInline(density, 'primary')) {
      items.push({
        id: 'indicators',
        label: 'Indicators',
        disabled: !activeChart,
        onClick: () => activeChart?.openIndicatorPicker(),
      });
    }

    if (!showInline(density, 'secondary')) {
      items.push(
        {
          id: 'commands',
          label: `Commands (${getShortcutLabel('openCommandPalette')})`,
          onClick: () => getCommandPalette()?.open(),
        },
        {
          id: 'change-symbol',
          label: `Change symbol (${getShortcutLabel('changeSymbol')})`,
          onClick: () => getSymbolSearch()?.open(),
        },
        {
          id: 'settings',
          label: 'Chart settings',
          disabled: !commands,
          onClick: () => commands?.openSettings(),
        },
      );
    }

    if (!showInline(density, 'tertiary')) {
      items.push(
        {
          id: 'alert',
          label: 'Alert',
          disabled: !onOpenAlert,
          title: onOpenAlert ? 'Create price alert' : 'Alerts not available',
          onClick: onOpenAlert,
        },
        {
          id: 'replay',
          label: 'Replay',
          disabled: !commands,
          active: commands?.replayActive,
          onClick: () => commands?.toggleReplay(),
        },
        {
          id: 'undo',
          label: commands?.canUndo
            ? `Undo (${getShortcutLabel('undo')})`
            : 'Undo',
          disabled: !commands?.canUndo,
          onClick: () => commands?.undo(),
        },
        {
          id: 'redo',
          label: commands?.canRedo
            ? `Redo (${getShortcutLabel('redo')})`
            : 'Redo',
          disabled: !commands?.canRedo,
          onClick: () => commands?.redo(),
        },
        {
          id: 'trade',
          label: 'Trade',
          disabled: !onOpenTrade,
          title: onOpenTrade ? 'Open trade ticket' : 'Trading not available',
          onClick: onOpenTrade,
        },
        {
          id: 'publish',
          label: 'Publish',
          disabled: true,
          title: 'Publishing not available',
        },
      );
    }

    if (density === 'full') {
      items.push(
        {
          id: 'alert',
          label: 'Alert',
          disabled: !onOpenAlert,
          title: onOpenAlert ? 'Create price alert' : 'Alerts not available',
          onClick: onOpenAlert,
        },
        {
          id: 'publish',
          label: 'Publish',
          disabled: true,
          title: 'Publishing not available',
        },
      );
    }

    return items;
  }, [activeChart, commands, density, onOpenTrade, onOpenAlert]);

  const showStudiesCluster = showInline(density, 'primary');
  const showHistoryCluster = showInline(density, 'tertiary');
  const showToolsCluster = showInline(density, 'secondary');
  const showTradeInline = showInline(density, 'tertiary') && onOpenTrade;

  return (
    <>
      <div
        ref={headerRef}
        data-header-density={density}
        className={`${headerBarClass(theme)} min-w-0 overflow-hidden`}
        role="toolbar"
        aria-label="Chart header"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <div
            className="flex min-w-0 items-center gap-1"
            data-testid="chart-header-instrument-cluster"
          >
            <SearchBar
              onSelect={chartActions.onSymbolSelect}
              initial={symbol}
              compact
              theme={theme}
            />
            {symbolNav ? (
              <SymbolNavArrows
                theme={theme}
                canBack={symbolNav.canBack}
                canForward={symbolNav.canForward}
                onBack={symbolNav.onBack}
                onForward={symbolNav.onForward}
              />
            ) : null}
            <ChartIntervalMenu
              theme={theme}
              value={interval}
              onChange={chartActions.onIntervalChange}
            />
            <ChartTypeMenu
              theme={theme}
              value={chartType}
              onChange={chartActions.onChartTypeChange}
            />
          </div>

          {showStudiesCluster ? (
            <>
              <ChartHeaderDivider theme={theme} />
              <div
                className="flex shrink-0 items-center gap-1"
                data-testid="chart-header-studies-cluster"
              >
                <ChartHeaderButton
                  theme={theme}
                  label="Indicators"
                  onClick={() => activeChart?.openIndicatorPicker()}
                  disabled={!activeChart}
                  data-testid="indicators-trigger"
                >
                  <IndicatorsIcon />
                </ChartHeaderButton>
                <ChartIndicatorFavoritesMenu
                  theme={theme}
                  favorites={favorites}
                  onSelect={(name) => commands?.addFavoriteIndicator(name)}
                />
                <ChartTemplateMenu
                  theme={theme}
                  onSaveStudyTemplate={() => commands?.openStudyTemplate()}
                  onOpenTemplate={() => commands?.openChartTemplate()}
                />
              </div>
            </>
          ) : null}

          {showHistoryCluster ? (
            <>
              <ChartHeaderDivider theme={theme} />
              <div
                className="flex shrink-0 items-center gap-1"
                data-testid="chart-header-history-cluster"
              >
                <ChartHeaderButton
                  theme={theme}
                  label="Replay"
                  active={commands?.replayActive}
                  onClick={() => commands?.toggleReplay()}
                  disabled={!commands}
                  data-testid="replay-trigger"
                >
                  <ReplayIcon />
                </ChartHeaderButton>
                <ChartHeaderButton
                  theme={theme}
                  iconOnly
                  disabled={!commands?.canUndo}
                  title={commands?.canUndo ? `Undo (${getShortcutLabel('undo')})` : 'Nothing to undo'}
                  onClick={() => commands?.undo()}
                  data-testid="undo-trigger"
                >
                  <UndoIcon />
                </ChartHeaderButton>
                <ChartHeaderButton
                  theme={theme}
                  iconOnly
                  disabled={!commands?.canRedo}
                  title={commands?.canRedo ? `Redo (${getShortcutLabel('redo')})` : 'Nothing to redo'}
                  onClick={() => commands?.redo()}
                  data-testid="redo-trigger"
                >
                  <RedoIcon />
                </ChartHeaderButton>
              </div>
            </>
          ) : null}
        </div>

        <div
          className="ml-auto flex shrink-0 items-center gap-1"
          data-testid="chart-header-actions-cluster"
        >
          <ChartLayoutMenu
            theme={theme}
            layoutName={layoutName}
            layoutId={layoutId}
            linkSymbol={linkSymbol}
            linkInterval={linkInterval}
            linkCrosshair={linkCrosshair}
            linkDrawings={linkDrawings}
            onLayoutChange={layoutActions.onLayoutChange}
            onLayoutSyncChange={layoutActions.onLayoutSyncChange}
            onRenameLayout={workspaceActions?.onRenameLayout}
          />

          {showToolsCluster ? (
            <>
              <ChartHeaderDivider theme={theme} />
              <div className="flex shrink-0 items-center gap-0.5">
                <ChartHeaderButton
                  theme={theme}
                  iconOnly
                  title={`Commands | ${getShortcutLabel('openCommandPalette')}`}
                  onClick={() => getCommandPalette()?.open()}
                  data-testid="command-palette-trigger"
                >
                  <QuickSearchIcon />
                </ChartHeaderButton>
                <ChartHeaderButton
                  theme={theme}
                  iconOnly
                  title="Chart settings"
                  onClick={() => commands?.openSettings()}
                  disabled={!commands}
                  data-testid="settings-trigger"
                >
                  <SettingsIcon />
                </ChartHeaderButton>
                <ChartFullscreenButton theme={theme} />
                <ChartSnapshotMenu theme={theme} />
                <ChartHeaderButton
                  theme={theme}
                  label="Capture"
                  active={activeChart?.drawingToolbarState.patternCaptureActive}
                  title={`Pattern capture (${getShortcutLabel("patternCaptureToggle")})`}
                  onClick={() => activeChart?.uiCommands.togglePatternCapture()}
                  disabled={!activeChart}
                  data-testid="pattern-capture-trigger"
                />
              </div>
            </>
          ) : null}

          {showTradeInline ? (
            <>
              <ChartHeaderDivider theme={theme} />
              <ChartHeaderButton
                theme={theme}
                label="Trade"
                title="Open trade ticket"
                onClick={onOpenTrade}
                data-testid="trade-trigger"
              />
            </>
          ) : null}

          {moreItems.length > 0 ? <ChartHeaderMoreMenu theme={theme} items={moreItems} /> : null}
        </div>
      </div>

    </>
  );
}
