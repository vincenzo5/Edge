"use client";

type Props = {
  label: string;
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function EdgeMenuSectionHeader({ label, collapsed, onToggle }: Props) {
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="edge-section-header edge-focus-ring flex w-full items-center justify-between"
      >
        <span>{label}</span>
        <span className="text-[10px] opacity-70">{collapsed ? "▾" : "▴"}</span>
      </button>
    );
  }
  return <div className="edge-section-header">{label}</div>;
}
