'use client';

import { useEffect, useState } from 'react';
import type { ChartType, GridMode, Theme } from '@/lib/chartConfig';
import type { Interval } from '@/lib/chart/contracts';
import { loadIndicatorFavorites } from '@/lib/chart/indicatorFavorites';
import { useActiveChart } from '../ActiveChartContext';
import SearchBar from '../SearchBar';
import ChartHeaderDivider from './ChartHeaderDivider';
import ChartHeaderButton from './ChartHeaderButton';
import ChartIntervalMenu from './ChartIntervalMenu';
import ChartTypeMenu from './ChartTypeMenu';
import ChartIndicatorFavoritesMenu from './ChartIndicatorFavoritesMenu';
import ChartTemplateMenu from './ChartTemplateMenu';
import ChartLayoutMenu from './ChartLayoutMenu';
import ChartQuickSearchModal from './ChartQuickSearchModal';
import ChartSnapshotMenu from './ChartSnapshotMenu';
import ChartFullscreenButton from './ChartFullscreenButton';
import { headerBarClass } from './headerStyles';
import {
  AlertIcon,
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
  gridMode: GridMode;
  linked: boolean;
  theme: Theme;
};

export type ChartHeaderChartState = {
  symbol: string;
  interval: Interval;
  chartType: ChartType;
  indicatorFavorites?: string[];
};

export type ChartHeaderLayoutActions = {
  onGridModeChange: (mode: GridMode) => void;
  onLinkedChange: (linked: boolean) => void;
};

export type ChartHeaderChartActions = {
  onSymbolSelect: (result: SymbolResult) => void;
  onIntervalChange: (interval: Interval) => void;
  onChartTypeChange: (chartType: ChartType) => void;
};

type Props = {
  layout: ChartHeaderLayoutState;
  chart: ChartHeaderChartState;
  layoutActions: ChartHeaderLayoutActions;
  chartActions: ChartHeaderChartActions;
};

export default function ChartHeaderBar({
  layout,
  chart,
  layoutActions,
  chartActions,
}: Props) {
  const { theme, gridMode, linked, layoutName } = layout;
  const { symbol, interval, chartType, indicatorFavorites } = chart;
  const activeChart = useActiveChart();
  const commands = activeChart?.headerCommands;
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);

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

  return (
    <>
      <div className={headerBarClass(theme)} role="toolbar" aria-label="Chart header">
        <div className="flex min-w-0 items-center gap-0.5">
          <SearchBar
            onSelect={chartActions.onSymbolSelect}
            initial={symbol}
            compact
            theme={theme}
          />
          <ChartHeaderDivider theme={theme} />
          <ChartIntervalMenu
            theme={theme}
            value={interval}
            onChange={chartActions.onIntervalChange}
          />
          <ChartHeaderDivider theme={theme} />
          <ChartTypeMenu theme={theme} value={chartType} onChange={chartActions.onChartTypeChange} />
          <ChartHeaderDivider theme={theme} />
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
          <ChartHeaderDivider theme={theme} />
          <ChartHeaderButton theme={theme} label="Alert" disabled title="Alerts coming soon">
            <AlertIcon />
          </ChartHeaderButton>
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
          <ChartHeaderDivider theme={theme} />
          <ChartHeaderButton
            theme={theme}
            iconOnly
            disabled={!commands?.canUndo}
            title={commands?.canUndo ? 'Undo (⌘ Z)' : 'Nothing to undo'}
            onClick={() => commands?.undo()}
            data-testid="undo-trigger"
          >
            <UndoIcon />
          </ChartHeaderButton>
          <ChartHeaderButton
            theme={theme}
            iconOnly
            disabled={!commands?.canRedo}
            title={commands?.canRedo ? 'Redo (⌘ ⇧ Z)' : 'Nothing to redo'}
            onClick={() => commands?.redo()}
            data-testid="redo-trigger"
          >
            <RedoIcon />
          </ChartHeaderButton>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <ChartLayoutMenu
            theme={theme}
            layoutName={layoutName}
            gridMode={gridMode}
            linked={linked}
            onGridModeChange={layoutActions.onGridModeChange}
            onLinkedChange={layoutActions.onLinkedChange}
          />
          <ChartHeaderButton
            theme={theme}
            iconOnly
            title="Quick search | ⌘ K"
            onClick={() => setQuickSearchOpen(true)}
            data-testid="quick-search-trigger"
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
          <ChartHeaderDivider theme={theme} />
          <ChartHeaderButton theme={theme} label="Trade" disabled title="Trading not available" />
          <ChartHeaderButton
            theme={theme}
            label="Publish"
            disabled
            title="Publishing not available"
          />
        </div>
      </div>

      <ChartQuickSearchModal
        open={quickSearchOpen}
        theme={theme}
        onClose={() => setQuickSearchOpen(false)}
      />
    </>
  );
}
