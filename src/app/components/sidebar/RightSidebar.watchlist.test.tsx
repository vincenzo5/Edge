import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RightSidebar from './RightSidebar';
import { WatchlistProvider } from '../watchlist/WatchlistContext';

describe('RightSidebar watchlist panel', () => {
  it('renders watchlist panel without ActiveChartProvider', () => {
    render(
      <WatchlistProvider>
        <RightSidebar activePanel="watchlist" mode="inline" width={300} viewportWidth={1440} />
      </WatchlistProvider>,
    );

    expect(screen.getByTestId('sidebar-panel-watchlist')).toBeInTheDocument();
    expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument();
  });
});
