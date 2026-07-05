/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceLegendLayout from './PriceLegendLayout';
import type { PriceLegendLayout as PriceLegendLayoutModel } from '../engine/priceLegendLayout';

const baseLayout: PriceLegendLayoutModel = {
  mode: 'idle',
  identity: {
    letter: 'A',
    title: 'Apple Inc.',
  },
  barTone: 'positive',
  valueColor: 'var(--edge-positive)',
  ohlc: {
    open: '263.53',
    high: '266.82',
    low: '262.45',
    close: '264.35',
  },
  change: '+0.47 (+0.18%)',
  isLive: true,
};

describe('PriceLegendLayout', () => {
  it('renders inline OHLC group with change', () => {
    render(<PriceLegendLayout layout={baseLayout} />);

    const group = screen.getByTestId('price-legend-ohlc-group');
    expect(group).toHaveTextContent('263.53');
    expect(group).toHaveTextContent('264.35');
    expect(screen.getByTestId('price-legend-change')).toHaveTextContent('+0.47');
  });

  it('does not render interval, exchange, hero, volume, or live badge', () => {
    render(<PriceLegendLayout layout={baseLayout} />);

    expect(screen.queryByText('1D')).toBeNull();
    expect(screen.queryByText('NASDAQ')).toBeNull();
    expect(screen.queryByTestId('price-legend-hero')).toBeNull();
    expect(screen.queryByText('17.17M')).toBeNull();
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.queryByText('Regular')).toBeNull();
  });

  it('applies tone color to OHLC values and change', () => {
    render(<PriceLegendLayout layout={baseLayout} />);

    expect(screen.getByTestId('price-legend-value-O')).toHaveStyle({
      color: 'var(--edge-positive)',
    });
    expect(screen.getByTestId('price-legend-change')).toHaveStyle({
      color: 'var(--edge-positive)',
    });
  });

  it('applies negative tone color', () => {
    render(
      <PriceLegendLayout
        layout={{
          ...baseLayout,
          barTone: 'negative',
          valueColor: 'var(--edge-negative)',
          change: '-13.56 (-5.92%)',
        }}
      />,
    );

    expect(screen.getByTestId('price-legend-value-C')).toHaveStyle({
      color: 'var(--edge-negative)',
    });
    expect(screen.getByTestId('price-legend-change')).toHaveStyle({
      color: 'var(--edge-negative)',
    });
  });

  it('applies neutral tone color', () => {
    render(
      <PriceLegendLayout
        layout={{
          ...baseLayout,
          barTone: 'neutral',
          valueColor: 'var(--edge-text-secondary)',
          change: '0.00 (0.00%)',
        }}
      />,
    );

    expect(screen.getByTestId('price-legend-value-C')).toHaveStyle({
      color: 'var(--edge-text-secondary)',
    });
  });

  it('renders leading slot content', () => {
    render(
      <PriceLegendLayout
        layout={baseLayout}
        leadingSlot={<span data-testid="leading-slot">nav</span>}
      />,
    );

    expect(screen.getByTestId('leading-slot')).toBeTruthy();
  });

  it('mounts context slot inside identity group hidden by default', () => {
    render(
      <PriceLegendLayout
        layout={baseLayout}
        contextSlot={<span data-testid="context-content">XLF</span>}
      />,
    );

    expect(screen.getByTestId('price-legend-identity-trigger')).toBeTruthy();
    const contextSlot = screen.getByTestId('price-legend-context-slot');
    expect(contextSlot).toHaveClass('hidden');
    expect(contextSlot).toHaveClass('absolute');
    expect(contextSlot).toHaveClass('group-hover/legend-identity:flex');
    expect(screen.getByTestId('context-content')).toBeTruthy();
  });
});
