import '@testing-library/jest-dom/vitest';

// Minimal ResizeObserver polyfill for jsdom
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserver;
