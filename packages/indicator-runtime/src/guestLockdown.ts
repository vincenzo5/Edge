import { DENIED_GUEST_GLOBALS } from './guestGlobals.js';

/** Strip or shadow host globals inside the QuickJS guest before user code runs. */
export const GUEST_LOCKDOWN_BOOTSTRAP = `
(function __edgeLockdown() {
  const denied = ${JSON.stringify([...DENIED_GUEST_GLOBALS])};
  for (const name of denied) {
    try {
      if (typeof globalThis[name] !== 'undefined') {
        globalThis[name] = undefined;
      }
    } catch (_) {}
  }
})();
`;
