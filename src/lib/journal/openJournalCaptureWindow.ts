export const JOURNAL_CAPTURE_WINDOW_FEATURES =
  "popup=yes,width=1280,height=900,menubar=no,toolbar=no,location=no,status=no";

export function buildJournalCaptureUrl(args: { token: string; tradeId: string }): string {
  const params = new URLSearchParams({
    token: args.token,
    tradeId: args.tradeId,
  });
  return `/journal/capture?${params.toString()}`;
}

export type OpenJournalCaptureWindowResult =
  | { ok: true; window: Window }
  | { ok: false; reason: "popup_blocked" };

export function openJournalCaptureWindow(args: {
  token: string;
  tradeId: string;
}): OpenJournalCaptureWindowResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "popup_blocked" };
  }

  const url = buildJournalCaptureUrl(args);
  const win = window.open(
    url,
    `edge-journal-capture-${args.token}`,
    JOURNAL_CAPTURE_WINDOW_FEATURES,
  );
  if (!win) {
    return { ok: false, reason: "popup_blocked" };
  }

  return { ok: true, window: win };
}
