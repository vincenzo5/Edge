'use client';

import DrawingToolbar, { resolveGroupSelections } from '../DrawingToolbar';
import { useActiveChart } from '../ActiveChartContext';
import type { Theme, ToolbarPrefs } from '@/lib/chartConfig';
import type { DrawingToolName } from '../chart-icons/toolGroups';

type Props = {
  theme: Theme;
  toolbarPrefs: ToolbarPrefs;
  onToolbarPrefsChange: (next: ToolbarPrefs) => void;
};

export default function ChartDrawingRail({
  theme,
  toolbarPrefs,
  onToolbarPrefsChange,
}: Props) {
  const snapshot = useActiveChart();

  const magnet = toolbarPrefs.magnet ?? false;
  const keepDrawing = toolbarPrefs.keepDrawing ?? false;
  const groupSelections = resolveGroupSelections(
    toolbarPrefs.groupSelections as Record<string, DrawingToolName> | undefined,
  );

  const toolbarState = snapshot?.drawingToolbarState;
  const actions = snapshot?.drawingToolbarActions;

  const handleGroupSelectionsChange = (next: Record<string, DrawingToolName>) => {
    onToolbarPrefsChange({ ...toolbarPrefs, groupSelections: next });
  };

  return (
    <div
      className="relative z-20 flex h-full shrink-0 self-stretch overflow-visible"
      data-testid="chart-drawing-rail"
    >
      <DrawingToolbar
        theme={theme}
        compact
        disabled={!snapshot}
        activeTool={toolbarState?.activeTool ?? '__cursor__'}
        magnet={magnet}
        keepDrawing={keepDrawing}
        allLocked={toolbarState?.allLocked ?? false}
        allHidden={toolbarState?.allHidden ?? false}
        groupSelections={groupSelections}
        onGroupSelectionsChange={handleGroupSelectionsChange}
        onToolSelect={(tool) => actions?.selectTool(tool)}
        onClear={() => actions?.clearDrawings()}
        onToggleMagnet={(on) => actions?.toggleMagnet(on)}
        onToggleKeepDrawing={(on) => actions?.toggleKeepDrawing(on)}
        onToggleLockAll={() => actions?.toggleLockAll()}
        onToggleHideAll={() => actions?.toggleHideAll()}
        onZoomIn={() => actions?.zoomIn()}
        onDeleteSelected={
          toolbarState?.hasSelection ? () => actions?.deleteSelected() : undefined
        }
      />
    </div>
  );
}
