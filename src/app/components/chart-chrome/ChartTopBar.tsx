'use client';

import type { ChartType, IndicatorConfig, Theme } from '@/lib/chartConfig';
import type { Interval } from '@/lib/chart/contracts';
import SearchBar from '../SearchBar';
import ChartHeaderDivider from './ChartHeaderDivider';
import ChartHeaderButton from './ChartHeaderButton';
import ChartIntervalMenu from './ChartIntervalMenu';
import ChartTypeMenu from './ChartTypeMenu';
import ChartIndicatorFavoritesMenu from './ChartIndicatorFavoritesMenu';
import ChartTemplateMenu from './ChartTemplateMenu';
import { headerBarClass } from './headerStyles';
import {
  AlertIcon,
  IndicatorsIcon,
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

export type ChartTopBarActions = {
  onSymbolSelect: (result: SymbolResult) => void;
  onIntervalChange: (interval: Interval) => void;
  onChartTypeChange: (chartType: ChartType) => void;
  onOpenIndicators: () => void;
  onAddFavoriteIndicator: (name: string) => void;
  onSaveStudyTemplate: () => void;
  onOpenTemplate: () => void;
  onOpenSettings: () => void;
  onToggleReplay: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

type Props = {
  theme: Theme;
  compact?: boolean;
  symbol: string;
  interval: Interval;
  chartType: ChartType;
  indicatorFavorites: string[];
  replayActive?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  actions: ChartTopBarActions;
};

export default function ChartTopBar({
  theme,
  compact = false,
  symbol,
  interval,
  chartType,
  indicatorFavorites,
  replayActive,
  canUndo,
  canRedo,
  actions,
}: Props) {
  return (
    <div className={headerBarClass(theme, compact)} role="toolbar" aria-label="Chart header">
      <div className="flex min-w-0 items-center gap-0.5">
        <SearchBar
          onSelect={actions.onSymbolSelect}
          initial={symbol}
          compact
          theme={theme}
        />
        <ChartHeaderDivider theme={theme} />
        <ChartIntervalMenu
          theme={theme}
          value={interval}
          onChange={actions.onIntervalChange}
        />
        {!compact && (
          <>
            <ChartHeaderDivider theme={theme} />
            <ChartTypeMenu theme={theme} value={chartType} onChange={actions.onChartTypeChange} />
            <ChartHeaderDivider theme={theme} />
            <ChartHeaderButton
              theme={theme}
              label="Indicators"
              onClick={actions.onOpenIndicators}
              data-testid="indicators-trigger"
            >
              <IndicatorsIcon />
            </ChartHeaderButton>
            <ChartIndicatorFavoritesMenu
              theme={theme}
              favorites={indicatorFavorites}
              onSelect={actions.onAddFavoriteIndicator}
            />
            <ChartTemplateMenu
              theme={theme}
              onSaveStudyTemplate={actions.onSaveStudyTemplate}
              onOpenTemplate={actions.onOpenTemplate}
            />
            <ChartHeaderDivider theme={theme} />
            <ChartHeaderButton
              theme={theme}
              label="Alert"
              disabled
              title="Alerts coming soon"
            >
              <AlertIcon />
            </ChartHeaderButton>
            <ChartHeaderButton
              theme={theme}
              label="Replay"
              active={replayActive}
              onClick={actions.onToggleReplay}
              data-testid="replay-trigger"
            >
              <ReplayIcon />
            </ChartHeaderButton>
            <ChartHeaderDivider theme={theme} />
            <ChartHeaderButton
              theme={theme}
              iconOnly
              disabled={!canUndo}
              title={canUndo ? 'Undo (⌘ Z)' : 'Nothing to undo'}
              onClick={actions.onUndo}
              data-testid="undo-trigger"
            >
              <UndoIcon />
            </ChartHeaderButton>
            <ChartHeaderButton
              theme={theme}
              iconOnly
              disabled={!canRedo}
              title={canRedo ? 'Redo (⌘ ⇧ Z)' : 'Nothing to redo'}
              onClick={actions.onRedo}
              data-testid="redo-trigger"
            >
              <RedoIcon />
            </ChartHeaderButton>
          </>
        )}
      </div>

      {!compact && (
        <div className="ml-auto flex items-center gap-0.5">
          <ChartHeaderButton
            theme={theme}
            iconOnly
            title="Chart settings"
            onClick={actions.onOpenSettings}
            data-testid="settings-trigger"
          >
            <SettingsIcon />
          </ChartHeaderButton>
          <ChartHeaderDivider theme={theme} />
          <ChartHeaderButton theme={theme} label="Trade" disabled title="Trading not available" />
          <ChartHeaderButton
            theme={theme}
            label="Publish"
            disabled
            title="Publishing not available"
          />
        </div>
      )}
    </div>
  );
}

export type { IndicatorConfig };
