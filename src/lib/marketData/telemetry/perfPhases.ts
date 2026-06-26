export type MarketDataPerfLayer =
  | "client"
  | "api"
  | "service"
  | "cache"
  | "provider"
  | "sidecar"
  | "chart";

export type MarketDataPerfPhase = {
  name: string;
  ms: number;
  ok: boolean;
  layer?: MarketDataPerfLayer;
  detail?: Record<string, unknown>;
};

export class PerfPhaseCollector {
  private phases: MarketDataPerfPhase[] = [];

  push(phase: MarketDataPerfPhase): void {
    this.phases.push(phase);
  }

  record(
    name: string,
    startedAt: number,
    ok: boolean,
    layer?: MarketDataPerfLayer,
    detail?: Record<string, unknown>,
  ): void {
    this.push({
      name,
      ms: Math.max(0, Date.now() - startedAt),
      ok,
      layer,
      detail,
    });
  }

  async measure<T>(
    name: string,
    layer: MarketDataPerfLayer,
    fn: () => Promise<T>,
    detail?: Record<string, unknown>,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      this.record(name, startedAt, true, layer, detail);
      return result;
    } catch (error) {
      this.record(name, startedAt, false, layer, {
        ...detail,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  toArray(): MarketDataPerfPhase[] {
    return [...this.phases];
  }
}

export function mergePerfPhases(
  ...groups: Array<MarketDataPerfPhase[] | undefined>
): MarketDataPerfPhase[] {
  return groups.flatMap((group) => group ?? []);
}
