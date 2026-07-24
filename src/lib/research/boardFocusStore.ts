/** Ephemeral focused chart card on the Research Board (not persisted). */

const listeners = new Set<() => void>();

let focusedCardId: string | null = null;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeBoardFocus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBoardFocusedCardId(): string | null {
  return focusedCardId;
}

export function setBoardFocusedCardId(cardId: string | null): void {
  if (focusedCardId === cardId) return;
  focusedCardId = cardId;
  notify();
}

export function clearBoardFocusForTests(): void {
  focusedCardId = null;
  notify();
}
