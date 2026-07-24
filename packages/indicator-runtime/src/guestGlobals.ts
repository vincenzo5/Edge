/** Globals that must not be reachable from guest scripts. */
export const DENIED_GUEST_GLOBALS = [
  'window',
  'document',
  'fetch',
  'XMLHttpRequest',
  'indexedDB',
  'localStorage',
  'sessionStorage',
  'Worker',
  'WebAssembly',
  'Date',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'Promise',
  'eval',
  'Function',
] as const;

export type DeniedGuestGlobal = (typeof DENIED_GUEST_GLOBALS)[number];

export type GuestCapabilityProbe = Record<string, string>;

/** Globals probed for capability reporting (denied + limited allowed). */
export const PROBED_GUEST_GLOBALS = [...DENIED_GUEST_GLOBALS, 'Math'] as const;

export const FORBIDDEN_SOURCE_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /^\s*import\s+/m, message: 'Imports are not allowed in user scripts' },
  { pattern: /^\s*export\s+\{/m, message: 'Named exports are not allowed' },
  { pattern: /\bimport\s*\(/, message: 'Dynamic imports are not allowed' },
  { pattern: /\beval\s*\(/, message: 'eval is not allowed' },
  { pattern: /\bnew\s+Function\s*\(/, message: 'dynamic code generation is not allowed' },
  { pattern: /\basync\s+function\b/, message: 'async functions are not allowed' },
  { pattern: /\bawait\b/, message: 'await is not allowed' },
  { pattern: /\bPromise\b/, message: 'Promise is not allowed' },
  { pattern: /\bsetTimeout\s*\(/, message: 'setTimeout is not allowed' },
  { pattern: /\bsetInterval\s*\(/, message: 'setInterval is not allowed' },
  { pattern: /\bdraw\s*\(/, message: 'custom draw() access is not allowed' },
  { pattern: /\bCanvas\b/, message: 'Canvas access is not allowed' },
  { pattern: /\bMath\.random\s*\(/, message: 'Math.random is not allowed' },
];
