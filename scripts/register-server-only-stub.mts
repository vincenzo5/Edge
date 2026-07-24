/**
 * No-op stub so lab scripts can import Next.js server modules (market data caches, etc.).
 * Loaded via `tsx --import ./scripts/register-server-only-stub.mts`.
 */
import Module from "node:module";

type ModuleWithHooks = typeof Module & {
  _resolveFilename: (
    request: string,
    parent: Module | null | undefined,
    isMain: boolean,
    options?: unknown,
  ) => string;
  _load: (request: string, parent: Module, isMain: boolean) => unknown;
};

const moduleHooks = Module as ModuleWithHooks;
const originalResolveFilename = moduleHooks._resolveFilename;
const originalLoad = moduleHooks._load;

moduleHooks._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") {
    return request;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

moduleHooks._load = function (request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
