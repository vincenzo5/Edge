"use client";

import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title?: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
  tone?: "neutral" | "error" | "warning";
  className?: string;
  "data-testid"?: string;
};

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "text-[var(--edge-text-primary)]",
  error: "text-[var(--edge-negative)]",
  warning: "text-[var(--edge-warning)]",
};

export default function EdgeEmptyState({
  icon,
  title,
  message,
  action,
  role,
  tone = "neutral",
  className = "",
  "data-testid": testId,
}: Props) {
  return (
    <div
      data-testid={testId}
      role={role}
      className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className}`.trim()}
    >
      {icon ? <div className="mb-4 opacity-80">{icon}</div> : null}
      {title ? (
        <p className="mb-1 text-sm font-medium text-[var(--edge-text-primary)]">{title}</p>
      ) : null}
      <p className={`max-w-xs text-sm ${toneClass[tone]}`}>{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
