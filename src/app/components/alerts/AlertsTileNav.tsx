"use client";

type Props = {
  onNewAlert: () => void;
};

export default function AlertsTileNav({ onNewAlert }: Props) {
  return (
    <div
      className="shrink-0 border-b border-[var(--edge-border-subtle)] px-3 py-2"
      data-testid="alerts-tile-nav"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]" data-testid="alerts-title">
          Alerts
        </h2>
        <button
          type="button"
          data-testid="alerts-new-button"
          className="text-xs text-[var(--edge-accent-blue)] hover:underline sm:hidden"
          onClick={onNewAlert}
        >
          New alert
        </button>
      </div>
    </div>
  );
}
