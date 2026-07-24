/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SidebarRail from './SidebarRail';

describe('SidebarRail responsive modes', () => {
  it('uses compact rail mode on phone widths', () => {
    render(
      <SidebarRail
        theme="dark"
        activePanel={null}
        railMode="compact"
        onTogglePanel={vi.fn()}
      />,
    );

    expect(screen.getByTestId('sidebar-rail')).toHaveAttribute('data-rail-mode', 'compact');
    expect(screen.getByTestId('sidebar-rail')).toHaveStyle({ width: '40px' });
  });
});
