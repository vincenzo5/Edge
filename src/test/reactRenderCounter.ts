/** Dev/test helper — track React render count without Profiler wiring. */
export function createRenderCounter() {
  const state = { count: 0 };
  return {
    count: () => state.count,
    reset: () => {
      state.count = 0;
    },
    trackRender: () => {
      state.count += 1;
    },
  };
}

export type RenderCounter = ReturnType<typeof createRenderCounter>;

/** Call at top of a component body to increment a shared render counter. */
export function useRenderCounter(counter: RenderCounter): void {
  counter.trackRender();
}
