"use client";

type Props = {
  className?: string;
  width?: string | number;
  height?: string | number;
};

export default function EdgeSkeletonLine({
  className = "",
  width,
  height = "0.75rem",
}: Props) {
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div
      aria-hidden
      className={`edge-skeleton-pulse rounded bg-[var(--edge-surface-hover)] ${className}`.trim()}
      style={width != null || height !== "0.75rem" ? style : { height }}
    />
  );
}
