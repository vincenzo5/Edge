import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockApp from './StockApp';

// Mock localStorage used by layoutStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('StockApp', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders the toolbar and chart grid without crashing', () => {
    render(<StockApp />);
    // Toolbar contains the app title / controls
    expect(screen.getByText(/Stock Charts/i)).toBeInTheDocument();
  });

  it('applies theme class to html element after hydration', async () => {
    render(<StockApp />);
    // After mount, the effect sets the class (default is dark)
    await vi.waitFor(() => {
      expect(document.documentElement.className).toMatch(/dark|light/);
    });
  });
});
