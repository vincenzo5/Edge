import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartLayoutMenu from './ChartLayoutMenu';
import { LAYOUT_MENU_ROWS, templatesForPaneCount } from '@/lib/chartConfig';

describe('ChartLayoutMenu', () => {
  const baseProps = {
    theme: 'dark' as const,
    layoutId: 'n1' as const,
    linkSymbol: false,
    linkInterval: false,
    linkCrosshair: true,
    linkDrawings: false,
    onLayoutChange: vi.fn(),
    onLayoutSyncChange: vi.fn(),
  };

  it('shows menu rows for pane counts 1-10, 12, 14, 16', () => {
    render(<ChartLayoutMenu {...baseProps} />);

    fireEvent.click(screen.getByTestId('layout-setup-trigger'));

    for (const paneCount of LAYOUT_MENU_ROWS) {
      expect(screen.getByText(String(paneCount))).toBeInTheDocument();
    }
  });

  it('renders six templates for pane count 3 and ten for pane count 4', () => {
    render(<ChartLayoutMenu {...baseProps} />);

    fireEvent.click(screen.getByTestId('layout-setup-trigger'));

    for (const template of templatesForPaneCount(3)) {
      expect(screen.getByTestId(`layout-template-${template.id}`)).toBeInTheDocument();
    }
    expect(templatesForPaneCount(3)).toHaveLength(6);
    expect(templatesForPaneCount(4)).toHaveLength(10);
  });

  it('calls onLayoutChange when a template is selected', () => {
    const onLayoutChange = vi.fn();
    render(<ChartLayoutMenu {...baseProps} onLayoutChange={onLayoutChange} />);

    fireEvent.click(screen.getByTestId('layout-setup-trigger'));
    fireEvent.click(screen.getByTestId('layout-template-n3-main-left'));

    expect(onLayoutChange).toHaveBeenCalledWith('n3-main-left');
  });

  it('highlights the active template', () => {
    render(<ChartLayoutMenu {...baseProps} layoutId="n3-cols" />);

    fireEvent.click(screen.getByTestId('layout-setup-trigger'));

    expect(screen.getByTestId('layout-template-n3-cols').className).toMatch(
      /edge-surface-active/,
    );
  });

  it('shows sync toggles at the bottom of the layout setup menu', () => {
    render(<ChartLayoutMenu {...baseProps} />);

    fireEvent.click(screen.getByTestId('layout-setup-trigger'));

    expect(screen.getByText('SYNC IN LAYOUT')).toBeInTheDocument();
    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Interval')).toBeInTheDocument();
    expect(screen.getByText('Crosshair')).toBeInTheDocument();
    expect(screen.getByText('Drawings')).toBeInTheDocument();
    expect(screen.getByText('Date range')).toBeInTheDocument();
  });
});
