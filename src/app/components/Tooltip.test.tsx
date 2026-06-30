import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Tooltip from '@/app/components/Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders children without tooltip when content is empty', () => {
    render(
      <Tooltip theme="dark">
        <span>Label</span>
      </Tooltip>,
    );
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip after hover delay', () => {
    render(
      <Tooltip content="Opening price for this bar" theme="dark">
        <span tabIndex={0}>O 100</span>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText('O 100'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Opening price for this bar');
  });

  it('renders portaled tooltip in document.body', () => {
    render(
      <Tooltip content="Lines — Trend Line" theme="dark" portaled>
        <button type="button">Lines</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Lines' }));
    act(() => {
      vi.advanceTimersByTime(400);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Lines — Trend Line');
    expect(tooltip.parentElement).toBe(document.body);
  });

  it('clamps portaled tooltip inside the left viewport edge', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 8,
      y: 20,
      width: 32,
      height: 20,
      top: 20,
      right: 40,
      bottom: 40,
      left: 8,
      toJSON: () => ({}),
    } as DOMRect);

    render(
      <Tooltip content="Opens related ETF SMH — Semiconductors sector" theme="dark" portaled>
        <button type="button">Semiconductors</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Semiconductors' }));
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole('tooltip')).toHaveStyle({ left: '120px' });
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Opening price for this bar" theme="dark">
        <span tabIndex={0}>O 100</span>
      </Tooltip>,
    );

    const trigger = screen.getByText('O 100');
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
