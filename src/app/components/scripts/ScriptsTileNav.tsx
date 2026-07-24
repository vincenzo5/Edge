"use client";

type Props = {
  onNewScript: () => void;
};

export default function ScriptsTileNav({ onNewScript }: Props) {
  return (
    <div
      className="shrink-0 border-b border-[var(--edge-border-subtle)] px-3 py-2"
      data-testid="scripts-tile-nav"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]" data-testid="scripts-title">
          Scripts
        </h2>
        <button
          type="button"
          className="text-xs text-[var(--edge-accent-blue)] hover:underline sm:hidden"
          onClick={onNewScript}
        >
          New script
        </button>
      </div>
    </div>
  );
}
