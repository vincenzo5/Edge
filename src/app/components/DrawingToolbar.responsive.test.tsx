/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrawingToolbar from './DrawingToolbar';
import { DEFAULT_TOOLBAR_PREFS } from '@/lib/chartConfig';

vi.mock('./DrawingToolGroup', () => ({
  default: () => <button type="button">Group</button>,
}));

vi.mock('./chart-icons/DrawingIcons', () => ({
  CrosshairIcon: () => null,
  ZoomInIcon: () => null,
  MeasureIcon: () => null,
  MagnetIcon: () => null,
  LockIcon: () => null,
  EyeIcon: () => null,
  TrashIcon: () => null,
}));

describe('DrawingToolbar responsive overflow', () => {
  it('allows vertical scrolling for clipped tool buttons', () => {
    render(
      <div style={{ height: 200 }}>
        <DrawingToolbar
          theme="dark"
          compact={false}
          disabled={false}
          activeTool="__cursor__"
          magnet={false}
          keepDrawing={false}
          allLocked={false}
          allHidden={false}
          groupSelections={DEFAULT_TOOLBAR_PREFS.groupSelections ?? {}}
          onGroupSelectionsChange={vi.fn()}
          onToolSelect={vi.fn()}
          onClear={vi.fn()}
          onToggleMagnet={vi.fn()}
          onToggleKeepDrawing={vi.fn()}
          onToggleLockAll={vi.fn()}
          onToggleHideAll={vi.fn()}
          onZoomIn={vi.fn()}
        />
      </div>,
    );

    const toolbar = screen.getByTestId('drawing-toolbar');
    expect(toolbar.className).toMatch(/overflow-y-auto/);
  });
});
