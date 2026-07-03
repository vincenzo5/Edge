'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChartType, GridMode, Theme, LayoutSyncPrefs } from '@/lib/chartConfig';
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
import ChartQuickSearchModal from './ChartQuickSearchModal';
import ChartSnapshotMenu from './ChartSnapshotMenu';
import ChartFullscreenButton from './ChartFullscreenButton';
import ChartHeaderMoreMenu from './ChartHeaderMoreMenu';
import SymbolNavArrows from './SymbolNavArrows';
import { ScreenerButton } from '../screener';
import { headerBarClass } from './headerStyles';
import {
  AlertIcon,
  IndicatorsIcon,
  MoonIcon,
  OptionsIcon,
  QuickSearchIcon,
  RedoIcon,
  ReplayIcon,
  SettingsIcon,
  SunIcon,
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
  linkSymbol: boolean;
  linkInterval: boolean;
  linkCrosshair: boolean;
  linkDrawings: boolean;
  theme: Theme;
};

export type ChartHeaderLayoutActions = {
  onGridModeChange: (mode: GridMode) => void;
  onLayoutSyncChange: (patch: Partial<LayoutSyncPrefs>) => void;
  onThemeChange: (theme: Theme) => void;
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
  onOpenOptionsChain?: () => void;
  onOpenScreener?: () => void;
};

export type ChartHeaderSymbolNav = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
};

type Props = {
  layout: ChartHeaderLayoutState;
  chart: ChartHeaderChartState;
  layoutActions: ChartHeaderLayoutActions;
  chartActions: ChartHeaderChartActions;
  symbolNav?: ChartHeaderSymbolNav;
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
  density: densityOverride,
}: Props) {
  const { theme, gridMode, linkSymbol, linkInterval, linkCrosshair, linkDrawings, layoutName } = layout;
  const { symbol, interval, chartType, indicatorFavorites } = chart;
  const activeChart = useActiveChart();
  const commands = activeChart?.headerCommands;
  const { registerQuickSearch } = useShortcutUI();
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [headerRef, headerSize] = useElementSize<HTMLDivElement>();
  const density =
    densityOverride ??
    resolveHeaderDensity(headerSize.width > 0 ? headerSize.width : 1440);

  useEffect(() => {
    registerQuickSearch({
      open: () => setQuickSearchOpen(true),
      close: () => setQuickSearchOpen(false),
      isOpen: () => quickSearchOpen,
    });
    return () => registerQuickSearch(null);
  }, [registerQuickSearch, quickSearchOpen]);

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
        id: 'screener',
        label: 'Stock screener',
        onClick: () => chartActions.onOpenScreener?.(),
      });
      items.push({
        id: 'options',
        label: 'Options chain',
        disabled: !activeChart || !chart.symbol,
        onClick: () => chartActions.onOpenOptionsChain?.(),
      });
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
          id: 'theme',
          label: theme === 'dark' ? 'Light mode' : 'Dark mode',
          onClick: () => layoutActions.onThemeChange(theme === 'dark' ? 'light' : 'dark'),
        },
        {
          id: 'quick-search',
          label: `Quick search (${getShortcutLabel('quickSearch')})`,
          onClick: () => setQuickSearchOpen(true),
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
          disabled: true,
          title: 'Alerts coming soon',
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
          disabled: true,
          title: 'Trading not available',
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
  }, [activeChart, commands, density, layoutActions, theme]);

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
          <ScreenerButton theme={theme} onOpen={() => chartActions.onOpenScreener?.()} />
          <ChartHeaderDivider theme={theme} />
          {showInline(density, 'primary') ? (
            <>
              <ChartHeaderButton
                theme={theme}
                label="Options"
                onClick={() => chartActions.onOpenOptionsChain?.()}
                disabled={!activeChart || !chart.symbol}
                data-testid="options-chain-trigger"
              >
                <OptionsIcon />
              </ChartHeaderButton>
              <ChartHeaderDivider theme={theme} />
            </>
          ) : null}
          <ChartIntervalMenu
            theme={theme}
            value={interval}
            onChange={chartActions.onIntervalChange}
          />
          <ChartHeaderDivider theme={theme} />
          <ChartTypeMenu
            theme={theme}
            value={chartType}
            onChange={chartActions.onChartTypeChange}
          />

          {showInline(density, 'primary') ? (
            <>
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
            </>
          ) : null}

          {showInline(density, 'tertiary') ? (
            <>
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
            </>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <ChartLayoutMenu
            theme={theme}
            layoutName={layoutName}
            gridMode={gridMode}
            linkSymbol={linkSymbol}
            linkInterval={linkInterval}
            linkCrosshair={linkCrosshair}
            linkDrawings={linkDrawings}
            onGridModeChange={layoutActions.onGridModeChange}
            onLayoutSyncChange={layoutActions.onLayoutSyncChange}
          />

          {showInline(density, 'secondary') ? (
            <>
              <ChartHeaderButton
                theme={theme}
                label={theme === 'dark' ? 'Light' : 'Dark'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => layoutActions.onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                data-testid="theme-toggle-trigger"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </ChartHeaderButton>
              <ChartHeaderButton
                theme={theme}
                iconOnly
                title={`Quick search | ${getShortcutLabel('quickSearch')}`}
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
            </>
          ) : null}

          {showInline(density, 'tertiary') ? (
            <>
              <ChartHeaderDivider theme={theme} />
              <ChartHeaderButton theme={theme} label="Trade" disabled title="Trading not available" />
              <ChartHeaderButton
                theme={theme}
                label="Publish"
                disabled
                title="Publishing not available"
              />
            </>
          ) : null}

          {density !== 'full' ? <ChartHeaderMoreMenu theme={theme} items={moreItems} /> : null}
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
