"use client";

type Props = {
  label: string;
};

export default function TileLoadingShell({ label }: Props) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-[var(--edge-text-secondary)]">
      Loading {label}…
    </div>
  );
}
