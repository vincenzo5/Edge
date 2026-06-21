import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Tooltip from '@/app/components/Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
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
