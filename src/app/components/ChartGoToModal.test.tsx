import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChartGoToModal from './ChartGoToModal';

describe('ChartGoToModal', () => {
  it('submits selected intraday date and time', async () => {
    const onGoTo = vi.fn().mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    const { container, getByRole } = render(
      <ChartGoToModal
        open
        theme="dark"
        interval="1h"
        defaultTimestampMs={new Date(2026, 0, 1).getTime()}
        onClose={onClose}
        onGoTo={onGoTo}
      />,
    );

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement | null;
    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement | null;
    expect(dateInput).not.toBeNull();
    expect(timeInput).not.toBeNull();

    fireEvent.change(dateInput!, { target: { value: '2026-01-02' } });
    fireEvent.change(timeInput!, { target: { value: '09:30' } });
    fireEvent.click(getByRole('button', { name: 'Go to' }));

    await waitFor(() => {
      expect(onGoTo).toHaveBeenCalledWith({
        mode: 'date',
        at: new Date(2026, 0, 2, 9, 30).getTime(),
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
