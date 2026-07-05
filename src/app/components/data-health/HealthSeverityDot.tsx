import type { DataHealthSeverity } from "@/lib/marketData/health";

export function severityDotClass(severity: DataHealthSeverity): string {
  switch (severity) {
    case "healthy":
      return "bg-[var(--edge-positive)]";
    case "degraded":
      return "bg-[var(--edge-warning)]";
    case "offline":
      return "bg-[var(--edge-negative)]";
    default:
      return "bg-[var(--edge-text-muted)]";
  }
}

export function severityRingClass(severity: DataHealthSeverity): string {
  switch (severity) {
    case "healthy":
      return "text-[var(--edge-text-muted)] ring-[var(--edge-border)]";
    case "degraded":
      return "text-[var(--edge-warning)] ring-[var(--edge-warning)]/30";
    case "offline":
      return "text-[var(--edge-negative)] ring-[var(--edge-negative)]/30";
    default:
      return "text-[var(--edge-text-muted)] ring-[var(--edge-border)]";
  }
}

type Props = {
  severity: DataHealthSeverity;
  size?: "sm" | "md";
  className?: string;
};

export default function HealthSeverityDot({ severity, size = "sm", className = "" }: Props) {
  const sizeClass = size === "md" ? "h-2.5 w-2.5" : "h-1.5 w-1.5";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full ${sizeClass} ${severityDotClass(severity)} ${className}`}
      aria-hidden
    />
  );
}

export function readinessLabelText(label: string | undefined): string {
  switch (label) {
    case "ok":
      return "OK";
    case "caveat":
      return "Caveat";
    case "blocked":
      return "Blocked";
    case "unavailable":
      return "Unavailable";
    case "idle":
      return "—";
    default:
      return "—";
  }
}

export function formatHealthEventAge(at: number, now = Date.now()): string {
  const deltaMs = Math.max(0, now - at);
  if (deltaMs < 1_000) return "just now";
  if (deltaMs < 60_000) return `${Math.round(deltaMs / 1_000)}s ago`;
  if (deltaMs < 3_600_000) return `${Math.round(deltaMs / 60_000)}m ago`;
  return `${Math.round(deltaMs / 3_600_000)}h ago`;
}
