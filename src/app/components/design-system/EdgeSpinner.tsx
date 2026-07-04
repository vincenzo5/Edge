"use client";

type Props = {
  size?: "sm" | "md";
  className?: string;
  "data-testid"?: string;
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-4 w-4 border",
  md: "h-8 w-8 border-2",
};

export default function EdgeSpinner({
  size = "md",
  className = "",
  "data-testid": testId,
}: Props) {
  return (
    <div
      data-testid={testId}
      aria-hidden
      className={`edge-spinner shrink-0 rounded-full border-[var(--edge-border)] border-t-[var(--edge-accent-blue)] ${sizeClass[size]} ${className}`.trim()}
    />
  );
}
