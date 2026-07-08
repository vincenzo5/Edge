"use client";

import { EdgeSkeletonLine } from "@/app/components/design-system";

type Props = {
  variant: "dashboard" | "trades";
};

function KpiRowSkeleton() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="journal-page-loading-kpis"
      aria-hidden
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
        >
          <EdgeSkeletonLine className="mb-3 h-3 w-24" />
          <EdgeSkeletonLine className="mb-4 h-8 w-32" />
          <EdgeSkeletonLine className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

function DashboardPanelsSkeleton() {
  return (
    <div
      className="mt-4 grid min-h-96 gap-4 lg:grid-cols-2 lg:items-stretch"
      data-testid="journal-page-loading-panels"
      aria-hidden
    >
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-80 flex-col rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
        >
          <EdgeSkeletonLine className="mb-3 h-4 w-28" />
          <EdgeSkeletonLine className="mb-2 h-3 w-full" />
          <EdgeSkeletonLine className="mb-2 h-3 w-[90%]" />
          <EdgeSkeletonLine className="mb-2 h-3 w-[95%]" />
          <EdgeSkeletonLine className="h-3 w-[85%]" />
        </div>
      ))}
    </div>
  );
}

function TradesTableSkeleton() {
  return (
    <div className="mt-4 space-y-3" data-testid="journal-page-loading-table" aria-hidden>
      <EdgeSkeletonLine className="h-8 w-full max-w-md" />
      <div className="overflow-hidden rounded border border-[var(--edge-border)]">
        <EdgeSkeletonLine className="h-10 w-full rounded-none" />
        {Array.from({ length: 8 }).map((_, index) => (
          <EdgeSkeletonLine key={index} className="h-9 w-full rounded-none border-t border-[var(--edge-border-subtle)]" />
        ))}
      </div>
    </div>
  );
}

export default function JournalPageLoadingSkeleton({ variant }: Props) {
  return (
    <div
      data-testid="journal-page-loading"
      data-variant={variant}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading journal"
    >
      <div data-testid="journal-page-loading-skeleton">
        <KpiRowSkeleton />
        {variant === "dashboard" ? (
          <>
            <DashboardPanelsSkeleton />
            <div
              className="mt-4 grid min-h-80 gap-4 lg:grid-cols-2 lg:items-stretch"
              aria-hidden
            >
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-80 flex-col rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
                >
                  <EdgeSkeletonLine className="mb-3 h-4 w-32" />
                  <EdgeSkeletonLine className="mb-2 h-8 w-full" />
                  <EdgeSkeletonLine className="mb-2 h-8 w-full" />
                  <EdgeSkeletonLine className="h-8 w-full" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <TradesTableSkeleton />
        )}
      </div>
    </div>
  );
}
