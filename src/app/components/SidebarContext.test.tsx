import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from './SidebarContext';

function SidebarProbe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useSidebar>) => void;
}) {
  const api = useSidebar();
  onReady(api);
  return null;
}

describe('SidebarContext', () => {
  it('opens a panel', () => {
    const onChange = vi.fn();
    let api: ReturnType<typeof useSidebar> | null = null;

    render(
      <SidebarProvider activePanel={null} onActivePanelChange={onChange}>
        <SidebarProbe onReady={(value) => { api = value; }} />
      </SidebarProvider>,
    );

    act(() => {
      api?.openPanel('object-tree');
    });

    expect(onChange).toHaveBeenCalledWith('object-tree');
  });

  it('toggles panel open and closed', () => {
    const onChange = vi.fn();
    let api: ReturnType<typeof useSidebar> | null = null;

    const { rerender } = render(
      <SidebarProvider activePanel={null} onActivePanelChange={onChange}>
        <SidebarProbe onReady={(value) => { api = value; }} />
      </SidebarProvider>,
    );

    act(() => {
      api?.togglePanel('object-tree');
    });
    expect(onChange).toHaveBeenCalledWith('object-tree');

    rerender(
      <SidebarProvider activePanel="object-tree" onActivePanelChange={onChange}>
        <SidebarProbe onReady={(value) => { api = value; }} />
      </SidebarProvider>,
    );

    act(() => {
      api?.togglePanel('object-tree');
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('closes the active panel', () => {
    const onChange = vi.fn();
    let api: ReturnType<typeof useSidebar> | null = null;

    render(
      <SidebarProvider activePanel="object-tree" onActivePanelChange={onChange}>
        <SidebarProbe onReady={(value) => { api = value; }} />
      </SidebarProvider>,
    );

    act(() => {
      api?.closePanel();
    });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
