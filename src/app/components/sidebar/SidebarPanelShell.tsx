"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  panelId: string;
  onClose: () => void;
  children: ReactNode;
};

export default function SidebarPanelShell({
  title,
  panelId,
  onClose,
  children,
}: Props) {
  return (
    <div
      data-testid="sidebar-panel"
      data-panel-id={panelId}
      className="flex w-[280px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </span>
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          ×
        </button>
      </div>
      <div
        data-testid={`sidebar-panel-${panelId}`}
        className="min-h-0 flex-1 overflow-auto"
      >
        {children}
      </div>
    </div>
  );
}
