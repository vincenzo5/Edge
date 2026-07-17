let idCounter = 0;

export function createAppWorkspaceId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** Reset counter for unit tests only. */
export function resetAppWorkspaceIdCounterForTests(): void {
  idCounter = 0;
}
