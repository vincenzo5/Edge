(globalThis as typeof globalThis & {
  ResizeObserver: new () => { observe(): void; unobserve(): void; disconnect(): void };
}).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
