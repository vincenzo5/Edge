import { LAYOUT_DIMENSIONS } from "@/lib/responsive/layoutConstants";
import { EdgeSkeletonLine, EdgeSpinner } from "../design-system";

function SkeletonCandleBars({ count = 6 }: { count?: number }) {
  return (
    <div className="w-full max-w-md space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <EdgeSkeletonLine
          key={index}
          className="h-3"
          width={`${70 + (index % 3) * 10}%`}
        />
      ))}
    </div>
  );
}

export default function AppHydrationShell() {
  const railWidth = LAYOUT_DIMENSIONS.sidebarRailWidth;

  return (
    <div
      data-testid="app-hydration-shell"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Starting Edge"
      className="edge-app-shell flex h-full min-h-0 flex-col overflow-hidden bg-[var(--edge-background)]"
    >
      <div
        data-testid="app-hydration-tab-bar"
        className="flex h-8 shrink-0 items-end gap-2 border-b border-[var(--edge-border)] bg-[var(--edge-background)] px-2 pt-0.5"
        aria-hidden
      >
        <EdgeSkeletonLine className="h-5 w-24" />
        <EdgeSkeletonLine className="h-5 w-20" />
        <EdgeSkeletonLine className="h-5 w-6" />
      </div>
      <div
        data-testid="app-hydration-header"
        className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-2"
        aria-hidden
      >
        <EdgeSkeletonLine className="h-6 w-28" />
        <EdgeSkeletonLine className="h-5 w-12" />
        <EdgeSkeletonLine className="h-5 w-14" />
        <div className="flex-1" />
        <EdgeSkeletonLine className="h-6 w-16" />
        <EdgeSkeletonLine className="h-6 w-16" />
        <EdgeSkeletonLine className="h-8 w-8" />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            <div
              data-testid="app-hydration-drawing-rail"
              className="flex w-11 shrink-0 flex-col gap-0.5 border-r border-[var(--edge-border)] bg-[var(--edge-surface-rail)] px-0.5 py-1.5"
              aria-hidden
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <EdgeSkeletonLine key={index} className="mx-auto h-9 w-9 rounded-[var(--edge-radius-sm)]" />
              ))}
            </div>

            <div
              data-testid="app-hydration-chart"
              className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--edge-surface-chart)]"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                aria-hidden
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, var(--edge-border-subtle) 0px, var(--edge-border-subtle) 0.5px, transparent 0.5px, transparent 40px), repeating-linear-gradient(90deg, var(--edge-border-subtle) 0px, var(--edge-border-subtle) 0.5px, transparent 0.5px, transparent 40px)",
                }}
              />
              <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8">
                <EdgeSpinner size="md" data-testid="app-hydration-spinner" />
                <div className="text-center">
                  <div className="text-xs font-medium text-[var(--edge-text-strong)]">
                    Starting Edge…
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--edge-text-secondary)]">
                    Restoring your workspace
                  </div>
                </div>
                <SkeletonCandleBars />
              </div>

              <div
                data-testid="app-hydration-range-bar"
                className="flex h-7 shrink-0 items-center gap-2 border-t border-[var(--edge-border-subtle)] bg-[var(--edge-surface-toolbar)] px-2"
                aria-hidden
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <EdgeSkeletonLine key={index} className="h-4 w-8" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          data-testid="app-hydration-sidebar-rail"
          style={{ width: railWidth }}
          className="flex shrink-0 flex-col gap-0.5 border-l border-[var(--edge-border)] bg-[var(--edge-surface-rail)] px-0.5 py-1.5"
          aria-hidden
        >
          {Array.from({ length: 7 }).map((_, index) => (
            <EdgeSkeletonLine key={index} className="mx-auto h-9 w-9 rounded-[var(--edge-radius-sm)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
