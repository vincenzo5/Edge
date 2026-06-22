import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ComponentProps } from 'react';
import PaneControlBar from './PaneControlBar';

type BarProps = ComponentProps<typeof PaneControlBar>;

function renderBar(overrides: Partial<BarProps> = {}) {
  const handlers = {
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onRemove: vi.fn(),
    onCollapse: vi.fn(),
    onMaximize: vi.fn(),
  };

  const props: BarProps = {
    paneKey: 'macd-id',
    theme: 'dark',
    stackIndex: 1,
    stackLength: 3,
    isCollapsed: false,
    isMaximized: false,
    isPricePane: false,
    ...handlers,
    ...overrides,
  };

  render(
    <div className="group" data-testid="pane-wrapper">
      <PaneControlBar {...props} />
    </div>,
  );

  return { ...handlers, props };
}

function buttonLabels() {
  return screen.getAllByRole('button').map((el) => el.getAttribute('aria-label'));
}

describe('PaneControlBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders buttons in move-up, move-down, remove, collapse, maximize order', () => {
    renderBar();
    expect(buttonLabels()).toEqual([
      'Move pane up',
      'Move pane down',
      'Remove pane',
      'Collapse pane',
      'Maximize pane',
    ]);
  });

  it('hides remove on price pane', () => {
    renderBar({ isPricePane: true, stackIndex: 0, stackLength: 2 });
    expect(screen.queryByRole('button', { name: 'Remove pane' })).not.toBeInTheDocument();
    expect(buttonLabels()).toEqual(['Move pane down', 'Collapse pane', 'Maximize pane']);
  });

  it('renders nothing when only one expanded pane exists', () => {
    renderBar({ stackLength: 1, stackIndex: 0, isPricePane: true });
    expect(screen.queryByTestId('pane-control-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pane-control-header')).not.toBeInTheDocument();
  });

  it('renders restore controls when the only pane is collapsed', () => {
    renderBar({
      stackLength: 1,
      stackIndex: 0,
      isPricePane: true,
      isCollapsed: true,
    });
    expect(screen.getByTestId('pane-control-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore pane' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move pane up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move pane down' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove pane' })).not.toBeInTheDocument();
  });

  it('shows remove on sub pane when multiple panes exist', () => {
    renderBar({ stackLength: 2, stackIndex: 1, isPricePane: false });
    expect(screen.getByRole('button', { name: 'Remove pane' })).toBeInTheDocument();
  });

  it('hides move up at stack top', () => {
    renderBar({ stackIndex: 0, stackLength: 2, isPricePane: true });
    expect(screen.queryByRole('button', { name: 'Move pane up' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move pane down' })).toBeInTheDocument();
  });

  it('hides move down at stack bottom (e.g. bottom sub-pane)', () => {
    renderBar({ stackIndex: 1, stackLength: 2, isPricePane: false });
    expect(screen.queryByRole('button', { name: 'Move pane down' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move pane up' })).toBeInTheDocument();
  });

  it('renders collapse and maximize on price pane', () => {
    renderBar({ isPricePane: true, stackIndex: 0, stackLength: 2 });
    expect(screen.getByRole('button', { name: 'Collapse pane' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maximize pane' })).toBeInTheDocument();
  });

  it('swaps collapse and maximize labels when pane is collapsed or maximized', () => {
    const { rerender } = render(
      <div className="group">
        <PaneControlBar
          paneKey="macd-id"
          theme="dark"
          stackIndex={1}
          stackLength={3}
          isCollapsed
          isMaximized={false}
          isPricePane={false}
          onCollapse={vi.fn()}
          onMaximize={vi.fn()}
        />
      </div>,
    );
    expect(screen.getByRole('button', { name: 'Restore pane' })).toBeInTheDocument();

    rerender(
      <div className="group">
        <PaneControlBar
          paneKey="macd-id"
          theme="dark"
          stackIndex={1}
          stackLength={3}
          isCollapsed={false}
          isMaximized
          isPricePane={false}
          onCollapse={vi.fn()}
          onMaximize={vi.fn()}
        />
      </div>,
    );
    expect(screen.getByRole('button', { name: 'Restore pane layout' })).toBeInTheDocument();
  });

  it('fires each visible handler on mouse down', () => {
    const { onMoveUp, onMoveDown, onRemove, onCollapse, onMaximize } = renderBar();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Move pane up' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Move pane down' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Remove pane' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Collapse pane' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Maximize pane' }));

    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onMaximize).toHaveBeenCalledTimes(1);
  });

  it('shows tooltip text after hover delay without double-click hint', () => {
    renderBar({ stackIndex: 0, stackLength: 2, isPricePane: true });
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Maximize pane' }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Maximize pane');
    expect(tooltip.textContent).not.toContain('Double click');
  });

  it('includes hover visibility classes on the control bar', () => {
    renderBar();
    const bar = screen.getByTestId('pane-control-bar');
    expect(bar.className).toMatch(/opacity-0/);
    expect(bar.className).toMatch(/group-hover:opacity-100/);
  });

  it('keeps controls visible when pane is collapsed', () => {
    renderBar({ isCollapsed: true });
    const bar = screen.getByTestId('pane-control-bar');
    expect(bar.className).toMatch(/opacity-100/);
    expect(bar.className).not.toMatch(/opacity-0/);
  });

  it('positions controls left of the price axis within the pane header', () => {
    renderBar();
    const header = screen.getByTestId('pane-control-header');
    expect(header.style.right).toBe('50px');
    expect(header.className).toMatch(/\bleft-0\b/);
  });
});
