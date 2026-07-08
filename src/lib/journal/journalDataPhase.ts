export type JournalDataPhase = "loading" | "empty" | "error" | "ready";

export function journalDataPhase(input: {
  loading: boolean;
  tradeCount: number;
  error?: string | null;
}): JournalDataPhase {
  if (input.loading && input.tradeCount === 0) return "loading";
  if (input.error && input.tradeCount === 0) return "error";
  if (!input.loading && input.tradeCount === 0) return "empty";
  return "ready";
}
