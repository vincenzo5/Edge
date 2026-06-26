"use client";

import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
};

export default function EdgeEmptyState({ icon, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon ? <div className="mb-4 opacity-80">{icon}</div> : null}
      <p className="max-w-xs text-sm text-[var(--edge-text-primary)]">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
