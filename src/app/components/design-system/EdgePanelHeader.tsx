"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  actions?: ReactNode;
};

export default function EdgePanelHeader({ title, actions }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-3 py-2">
      <h3 className="text-sm font-medium text-[var(--edge-text-primary)]">{title}</h3>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </div>
  );
}
