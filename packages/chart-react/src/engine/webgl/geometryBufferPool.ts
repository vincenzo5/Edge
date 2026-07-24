/** Grow-only Float32 scratch buffers keyed by slot (renderer-owned, cleared on dispose). */
export type GeometryBufferPool = {
  fromNumbers(key: string, values: number[]): Float32Array;
  clear(): void;
};

export function createGeometryBufferPool(): GeometryBufferPool {
  const slots = new Map<string, Float32Array>();
  const empty = new Float32Array(0);

  return {
    fromNumbers(key: string, values: number[]) {
      if (values.length === 0) return empty;
      let buf = slots.get(key);
      if (!buf || buf.length < values.length) {
        const nextLen = Math.max(values.length, buf?.length ?? 0, 64);
        buf = new Float32Array(nextLen);
        slots.set(key, buf);
      }
      buf.set(values, 0);
      return buf.subarray(0, values.length);
    },
    clear() {
      slots.clear();
    },
  };
}
