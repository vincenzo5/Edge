import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RightSidebar from './RightSidebar';

describe('RightSidebar', () => {
  it('renders nothing when no panel is active', () => {
    const { container } = render(<RightSidebar activePanel={null} mode="inline" width={300} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows panel shell when a panel is active', () => {
    render(<RightSidebar activePanel="object-tree" mode="inline" width={300} />);

    expect(screen.getByTestId('sidebar-panel')).toHaveAttribute('data-sidebar-mode', 'inline');
    expect(screen.getByTestId('sidebar-panel-object-tree')).toBeInTheDocument();
  });

  it('uses the same shared width regardless of active panel', () => {
    const { rerender } = render(
      <RightSidebar activePanel="object-tree" mode="inline" width={360} />,
    );

    expect(screen.getByTestId('sidebar-panel')).toHaveStyle({ width: '360px' });

    rerender(<RightSidebar activePanel="watchlist" mode="inline" width={360} />);
    expect(screen.getByTestId('sidebar-panel')).toHaveStyle({ width: '360px' });
  });

  it('hides docked shell when panel is floating', () => {
    const { container } = render(
      <RightSidebar activePanel="watchlist" mode="inline" width={360} isFloating />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
