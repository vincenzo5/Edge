"use client";

import type { ReactNode } from "react";
import { panelTitleClass } from "./styles";

type Props = {
  title: string;
  actions?: ReactNode;
};

export default function EdgePanelHeader({ title, actions }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-[var(--edge-space-3)] py-[var(--edge-space-2)]">
      <h3 className={`${panelTitleClass(true)} font-medium`}>{title}</h3>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </div>
  );
}
