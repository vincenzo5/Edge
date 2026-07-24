import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

const requestIdStorage = new AsyncLocalStorage<{ requestId: string }>();

export function getRequestId(): string | undefined {
  return requestIdStorage.getStore()?.requestId;
}

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestIdStorage.run({ requestId }, fn);
}
