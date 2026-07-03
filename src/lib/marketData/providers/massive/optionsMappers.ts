import type {
  OptionContractSnapshot,
  OptionExpiration,
  OptionsChainRequest,
  OptionsStrikeWindow,
} from "../../contracts/options";
import type {
  MassiveOptionChainSnapshot,
  MassiveOptionReferenceContract,
} from "../../contracts/massive";
import { optionContractSnapshotSchema } from "../../schemas/response";
import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";

/** Normalize Massive timestamps (ns or ms) to epoch ms. */
export function massiveTimestampToMs(value: unknown): number | null {
  const n = asFiniteNumber(value);
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 1e16) return Math.round(n / 1_000_000);
  if (n >= 1e11) return Math.round(n);
  return Math.round(n * 1000);
}

function mapContractType(raw: unknown): "call" | "put" | null {
  const value = asNonEmptyString(raw)?.toLowerCase();
  if (value === "call") return "call";
  if (value === "put") return "put";
  return null;
}

function midpoint(bid: number | null, ask: number | null): number | null {
  if (bid == null || ask == null) return null;
  return (bid + ask) / 2;
}

function snapshotUpdatedAt(snapshot: MassiveOptionChainSnapshot): number {
  const candidates = [
    snapshot.last_quote?.last_updated,
    snapshot.last_trade?.sip_timestamp,
    snapshot.fmv_last_updated,
    snapshot.day?.last_updated,
    snapshot.underlying_asset?.last_updated,
  ];
  for (const raw of candidates) {
    const ms = massiveTimestampToMs(raw);
    if (ms != null) return ms;
  }
  return Date.now();
}

export function mapMassiveOptionReferenceToExpiration(
  row: MassiveOptionReferenceContract,
  underlying: string,
): OptionExpiration | null {
  const expiration = asNonEmptyString(row.expiration_date);
  if (!expiration) return null;
  return {
    underlying,
    expiration,
  };
}

export function dedupeExpirations(expirations: OptionExpiration[]): OptionExpiration[] {
  const seen = new Set<string>();
  const out: OptionExpiration[] = [];
  for (const row of expirations) {
    if (seen.has(row.expiration)) continue;
    seen.add(row.expiration);
    out.push(row);
  }
  return out.sort((a, b) => a.expiration.localeCompare(b.expiration));
}

export function mapMassiveOptionSnapshotToContract(
  snapshot: MassiveOptionChainSnapshot,
  underlying: string,
  expiration: string,
): OptionContractSnapshot | null {
  const details = snapshot.details;
  const type = mapContractType(details?.contract_type);
  const strike = asFiniteNumber(details?.strike_price);
  const contractSymbol =
    asNonEmptyString(details?.ticker) ??
    asNonEmptyString(snapshot.ticker);
  if (!type || strike == null || strike <= 0 || !contractSymbol) return null;

  const bid = asFiniteNumber(snapshot.last_quote?.bid);
  const ask = asFiniteNumber(snapshot.last_quote?.ask);
  const last =
    asFiniteNumber(snapshot.last_trade?.price) ?? asFiniteNumber(snapshot.day?.close);
  const mark =
    asFiniteNumber(snapshot.last_quote?.midpoint) ??
    asFiniteNumber(snapshot.fmv) ??
    midpoint(bid, ask) ??
    last;

  const contract: OptionContractSnapshot = {
    contractSymbol,
    underlying,
    type,
    expiration: asNonEmptyString(details?.expiration_date) ?? expiration,
    strike,
    bid,
    ask,
    last,
    mark,
    volume: asFiniteNumber(snapshot.day?.volume),
    openInterest: asFiniteNumber(snapshot.open_interest),
    impliedVolatility: asFiniteNumber(snapshot.implied_volatility),
    delta: asFiniteNumber(snapshot.greeks?.delta),
    gamma: asFiniteNumber(snapshot.greeks?.gamma),
    theta: asFiniteNumber(snapshot.greeks?.theta),
    vega: asFiniteNumber(snapshot.greeks?.vega),
    rho: null,
    updatedAt: snapshotUpdatedAt(snapshot),
  };

  const parsed = optionContractSnapshotSchema.safeParse(contract);
  return parsed.success ? parsed.data : null;
}

export function uniqueStrikesFromReference(
  rows: MassiveOptionReferenceContract[],
): number[] {
  const strikes = new Set<number>();
  for (const row of rows) {
    const strike = asFiniteNumber(row.strike_price);
    if (strike != null && strike > 0) strikes.add(strike);
  }
  return [...strikes].sort((a, b) => a - b);
}

export function selectStrikesForWindow(
  strikes: number[],
  strikeWindow: OptionsStrikeWindow | undefined,
): number[] {
  if (!strikeWindow || strikeWindow.mode === "full") return strikes;
  const count = strikeWindow.count ?? 20;
  const half = Math.ceil(count / 2);
  const spot = strikeWindow.spot;
  if (spot == null || !Number.isFinite(spot)) {
    const mid = Math.floor(strikes.length / 2);
    const start = Math.max(0, mid - half);
    return strikes.slice(start, start + count);
  }
  const ranked = [...strikes].sort(
    (a, b) => Math.abs(a - spot) - Math.abs(b - spot),
  );
  return ranked.slice(0, count).sort((a, b) => a - b);
}

export function strikeRangeFromWindow(
  strikes: number[],
  strikeWindow: OptionsStrikeWindow | undefined,
): { gte?: number; lte?: number } {
  const selected = selectStrikesForWindow(strikes, strikeWindow);
  if (selected.length === 0) return {};
  return {
    gte: selected[0],
    lte: selected[selected.length - 1],
  };
}

export function filterSnapshotsForWindow(
  snapshots: MassiveOptionChainSnapshot[],
  request: OptionsChainRequest,
): MassiveOptionChainSnapshot[] {
  const strikeWindow = request.strikeWindow;
  if (!strikeWindow || strikeWindow.mode === "full") return snapshots;

  const strikes = uniqueStrikesFromReference(
    snapshots
      .map((row) => row.details)
      .filter((details): details is NonNullable<typeof details> => details != null)
      .map((details) => ({
        strike_price: details.strike_price,
        expiration_date: details.expiration_date,
      })),
  );
  const allowed = new Set(selectStrikesForWindow(strikes, strikeWindow));
  if (allowed.size === 0) return snapshots;

  return snapshots.filter((row) => {
    const strike = asFiniteNumber(row.details?.strike_price);
    return strike != null && allowed.has(strike);
  });
}
