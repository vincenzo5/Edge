import type { ProviderHealthStatus } from "@/lib/marketData/health";

export function connectionStatusLabel(status: ProviderHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Connected";
    case "degraded":
      return "Degraded";
    case "offline":
      return "Disconnected";
    case "disabled":
      return "Not configured";
    default:
      return "Unknown";
  }
}

export function connectionStatusTone(
  status: ProviderHealthStatus,
): "positive" | "warning" | "negative" | "muted" {
  switch (status) {
    case "healthy":
      return "positive";
    case "degraded":
      return "warning";
    case "offline":
      return "negative";
    default:
      return "muted";
  }
}

export function providerStatusLabel(status: ProviderHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "offline":
      return "Offline";
    case "disabled":
      return "Not configured";
    default:
      return "Unknown";
  }
}
