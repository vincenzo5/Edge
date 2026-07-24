import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import type { ScreenerReviewResume, ScreenerState } from "@/lib/screener/types";

export function computeScreenerQueryFingerprint(
  state: Pick<ScreenerState, "activeScreenId" | "query" | "sort">,
): string {
  return JSON.stringify({
    activeScreenId: state.activeScreenId,
    query: state.query,
    sort: state.sort ?? null,
  });
}

export function isReviewResumeValid(state: ScreenerState): boolean {
  const resume = state.reviewResume;
  if (!resume) return false;
  return resume.queryFingerprint === computeScreenerQueryFingerprint(state);
}

export function applyReviewResumeToSession(
  state: ScreenerState,
  session: ScreenerSessionState,
): ScreenerSessionState {
  const resume = state.reviewResume;
  if (!resume || !isReviewResumeValid(state)) {
    return session;
  }

  return {
    ...session,
    reviewIndex: resume.reviewIndex,
    keepers: [...resume.keepers],
    reviewActive: resume.reviewActive,
  };
}

export function buildReviewResumeFromSession(
  state: ScreenerState,
  session: Pick<ScreenerSessionState, "reviewIndex" | "keepers" | "reviewActive">,
): ScreenerReviewResume | null {
  if (!session.reviewActive && session.reviewIndex === 0 && session.keepers.length === 0) {
    return null;
  }

  return {
    reviewIndex: session.reviewIndex,
    keepers: [...session.keepers],
    reviewActive: session.reviewActive,
    queryFingerprint: computeScreenerQueryFingerprint(state),
  };
}

export function syncReviewResumeOntoState(
  state: ScreenerState,
  session: Pick<ScreenerSessionState, "reviewIndex" | "keepers" | "reviewActive">,
): ScreenerState {
  const reviewResume = buildReviewResumeFromSession(state, session);
  if (reviewResume === state.reviewResume) return state;
  return { ...state, reviewResume };
}

export function clearReviewResume(state: ScreenerState): ScreenerState {
  if (state.reviewResume == null) return state;
  return { ...state, reviewResume: null };
}

export function sanitizeReviewResumeOnLoad(state: ScreenerState): ScreenerState {
  if (!state.reviewResume) return state;
  if (isReviewResumeValid(state)) return state;
  return clearReviewResume(state);
}

export function clampReviewIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(index, total - 1));
}
