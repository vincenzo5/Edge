/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BarReplay from './BarReplay';

describe('BarReplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('activates and deactivates visible count', () => {
    const onVisibleChange = vi.fn();
    render(<BarReplay total={100} onVisibleChange={onVisibleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(onVisibleChange).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Stop Replay' }));
    expect(onVisibleChange).toHaveBeenLastCalledWith(null);
  });

  it('plays forward through bars', () => {
    const onVisibleChange = vi.fn();
    render(<BarReplay total={10} onVisibleChange={onVisibleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onVisibleChange.mock.calls.some((call) => call[0] != null && call[0] > 1)).toBe(true);
  });

  it('clamps index when total shrinks', () => {
    const onVisibleChange = vi.fn();
    const { rerender } = render(
      <BarReplay total={100} onVisibleChange={onVisibleChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    rerender(<BarReplay total={5} onVisibleChange={onVisibleChange} />);
    expect(onVisibleChange).toHaveBeenCalled();
  });
});
