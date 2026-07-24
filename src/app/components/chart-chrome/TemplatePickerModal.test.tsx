/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplatePickerModal from './TemplatePickerModal';

const mockPresets = [
  {
    version: 1 as const,
    id: 'chart-1',
    name: 'My Chart',
    createdAt: Date.now(),
    kind: 'chart' as const,
    payload: { chartType: 'candle_solid' as const, indicators: [], chartSettings: undefined },
  },
  {
    version: 1 as const,
    id: 'study-1',
    name: 'RSI Setup',
    createdAt: Date.now(),
    kind: 'study' as const,
    payload: { name: 'RSI', pane: 'sub' as const },
  },
];

vi.mock('@/lib/presetStorage', () => ({
  loadPresets: vi.fn(() => mockPresets),
  deletePreset: vi.fn(),
}));

describe('TemplatePickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists chart templates by default tab', () => {
    render(
      <TemplatePickerModal
        open
        initialTab="chart"
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText('My Chart')).toBeTruthy();
    expect(screen.queryByText('RSI Setup')).toBeNull();
  });

  it('switches to study tab', () => {
    render(
      <TemplatePickerModal
        open
        initialTab="chart"
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Study' }));
    expect(screen.getByText('RSI Setup')).toBeTruthy();
  });

  it('calls onApply when apply clicked', () => {
    const onApply = vi.fn();
    render(
      <TemplatePickerModal
        open
        initialTab="chart"
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(mockPresets[0]);
  });
});
