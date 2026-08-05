/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DrawingSelectionToolbar from './DrawingSelectionToolbar';
import type { SerializedDrawing } from '@edge/chart-core/contracts';

const drawing: SerializedDrawing = {
  id: 'd1',
  name: 'trend_line',
  label: 'Trend',
  points: [
    { timestamp: 1000, value: 100 },
    { timestamp: 3000, value: 115 },
  ],
  visible: true,
  locked: false,
  zLevel: 0,
  paneId: 'price',
  styles: { lineColor: '#ffcc00', lineWidth: 2, lineDash: [] },
};

const noopMetadata = {
  onMetadataChange: vi.fn(),
  onAcceptProposal: vi.fn(),
  onDismissProposal: vi.fn(),
};

describe('DrawingSelectionToolbar', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  it('renders toolbar controls for selected drawing', () => {
    render(
      <DrawingSelectionToolbar
        theme="dark"
        drawing={drawing}
        bounds={{ x: 100, y: 120, width: 80, height: 40 }}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={vi.fn()}
        onStyleChange={vi.fn()}
        {...noopMetadata}
        onOpenSettings={vi.fn()}
        onToggleLock={vi.fn()}
        onDelete={vi.fn()}
        onMore={vi.fn()}
      />,
    );

    expect(screen.getByRole('toolbar', { name: 'Drawing tools' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Drawing tools' })).toHaveClass('edge-popover-enter');
    expect(screen.getByLabelText('Line color')).toBeInTheDocument();
    expect(screen.getByLabelText('Annotation kind')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Settings').querySelector('[data-edge-icon="settings"]'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Delete drawing')).toBeInTheDocument();
  });

  it('calls action handlers', () => {
    const onStyleChange = vi.fn();
    const onOpenSettings = vi.fn();
    const onToggleLock = vi.fn();
    const onDelete = vi.fn();
    const onMore = vi.fn();

    render(
      <DrawingSelectionToolbar
        theme="dark"
        drawing={drawing}
        bounds={{ x: 100, y: 120, width: 80, height: 40 }}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={vi.fn()}
        onStyleChange={onStyleChange}
        {...noopMetadata}
        onOpenSettings={onOpenSettings}
        onToggleLock={onToggleLock}
        onDelete={onDelete}
        onMore={onMore}
      />,
    );

    fireEvent.click(screen.getByLabelText('Line width'));
    fireEvent.click(screen.getByRole('menuitem', { name: '3px' }));
    expect(onStyleChange).toHaveBeenCalledWith({ lineWidth: 3 });

    fireEvent.click(screen.getByLabelText('Settings'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Lock drawing'));
    expect(onToggleLock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Delete drawing'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('updates drag offset when grip is dragged', () => {
    const onDragOffsetChange = vi.fn();
    render(
      <DrawingSelectionToolbar
        theme="dark"
        drawing={drawing}
        bounds={{ x: 100, y: 120, width: 80, height: 40 }}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={onDragOffsetChange}
        onStyleChange={vi.fn()}
        {...noopMetadata}
        onOpenSettings={vi.fn()}
        onToggleLock={vi.fn()}
        onDelete={vi.fn()}
        onMore={vi.fn()}
      />,
    );

    const grip = screen.getByLabelText('Drag toolbar');
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 20, clientY: 25, pointerId: 1 });
    expect(onDragOffsetChange).toHaveBeenCalledWith({ x: 10, y: 15 });
  });

  it('shows accept and dismiss for AI proposals', () => {
    render(
      <DrawingSelectionToolbar
        theme="dark"
        drawing={{
          ...drawing,
          metadata: {
            kind: 'invalidation',
            source: 'ai',
            status: 'proposed',
            rationale: 'Break below $170',
          },
        }}
        bounds={{ x: 100, y: 120, width: 80, height: 40 }}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={vi.fn()}
        onStyleChange={vi.fn()}
        onMetadataChange={vi.fn()}
        onAcceptProposal={vi.fn()}
        onDismissProposal={vi.fn()}
        onOpenSettings={vi.fn()}
        onToggleLock={vi.fn()}
        onDelete={vi.fn()}
        onMore={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Accept AI proposal')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss AI proposal')).toBeInTheDocument();
    expect(screen.getByLabelText('Annotation rationale')).toBeInTheDocument();
    expect(screen.getByTestId('drawing-ai-suggested')).toBeInTheDocument();
  });

  it('calls open in chat for AI suggested drawings', () => {
    const onOpenInChat = vi.fn();
    render(
      <DrawingSelectionToolbar
        theme="dark"
        drawing={{
          ...drawing,
          metadata: {
            kind: 'thesis',
            source: 'ai',
            status: 'accepted',
            messageId: 'msg-1',
          },
        }}
        bounds={{ x: 100, y: 120, width: 80, height: 40 }}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={vi.fn()}
        onStyleChange={vi.fn()}
        onMetadataChange={vi.fn()}
        onAcceptProposal={vi.fn()}
        onDismissProposal={vi.fn()}
        onOpenInChat={onOpenInChat}
        onOpenSettings={vi.fn()}
        onToggleLock={vi.fn()}
        onDelete={vi.fn()}
        onMore={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open in chat'));
    expect(onOpenInChat).toHaveBeenCalledTimes(1);
  });
});
