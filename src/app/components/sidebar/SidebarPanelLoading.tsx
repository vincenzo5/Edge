"use client";

function SidebarPanelLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-xs text-[var(--edge-text-secondary)]">
      Loading {label}…
    </div>
  );
}

export default SidebarPanelLoading;
