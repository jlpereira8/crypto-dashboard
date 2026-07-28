/**
 * Market data — CoinPaprika.
 *
 * One provider, three endpoints, no key, no proxy. Chosen over CoinCap after
 * testing both: CoinCap v2 no longer resolves and v3 answers 401 without an API
 * key, while CoinPaprika serves `Access-Control-Allow-Origin: *` (so the browser
 * can call it directly) and returns the top 50 in a single 40 KB response.
 *
 * Free-tier limits, verified against the live API:
 *   • hourly history is only available for roughly the last 24 hours
 *   • daily history is only available for roughly the last 365 days
 * `rangeStart` clamps inside both windows, which is why 24H uses a 23-hour
 * lookback and 1Y uses 363 days rather than the round numbers.
 *
 * Only the fields the UI renders are normalised — nothing provider-specific
 * leaks past this module.
 */

const API_BASE = "https://api.coinpaprika.com/v1";
const LOGO_BASE = "https://static.coinpaprika.com/coin";
const REQUEST_TIMEOUT_MS = 10_000;

/* ── Types ───────────────────────────────────────────────────────────────── */

/** A row in the market list. `null` means "the provider didn't give us this". */
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  logoUrl: string;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  change24h: number | null;
  /** Epoch ms, or null if the provider sent an unparseable timestamp. */
  lastUpdated: number | null;
}

export interface GlobalMarket {
  marketCap: number | null;
  marketCapChange24h: number | null;
  volume24h: number | null;
  btcDominance: number | null;
  assetCount: number | null;
}

/** One point on a price series. `x` is epoch ms so the scale stays numeric. */
export interface PricePoint {
  x: number;
  y: number;
}

export type RangeId = "24H" | "7D" | "30D" | "90D" | "1Y";

export interface RangeConfig {
  id: RangeId;
  label: string;
  /** Used in accessible names and the chart's delta label. */
  description: string;
  interval: "1h" | "1d";
  /** Lookback in hours, clamped inside the free tier's window. */
  hours: number;
}

export const RANGES: readonly RangeConfig[] = [
  { id: "24H", label: "24H", description: "past 24 hours", interval: "1h", hours: 23 },
  { id: "7D", label: "7D", description: "past 7 days", interval: "1d", hours: 24 * 7 },
  { id: "30D", label: "30D", description: "past 30 days", interval: "1d", hours: 24 * 30 },
  { id: "90D", label: "90D", description: "past 90 days", interval: "1d", hours: 24 * 90 },
  { id: "1Y", label: "1Y", description: "past year", interval: "1d", hours: 24 * 363 },
];

export const DEFAULT_RANGE: RangeId = "7D";
export const DEFAULT_ASSET_ID = "btc-bitcoin";
export const TOP_ASSET_COUNT = 50;

export function getRange(id: RangeId): RangeConfig {
  return RANGES.find((range) => range.id === id) ?? RANGES[1];
}

/* ── Errors ──────────────────────────────────────────────────────────────── */

/**
 * The only error type that escapes this module. `message` is always safe to
 * show a user — raw provider payloads never reach the UI.
 */
export class MarketApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MarketApiError";
  }

  /** 4xx (except 429) won't succeed on retry. */
  get isRetryable(): boolean {
    if (this.status === undefined) return true;
    if (this.status === 429) return true;
    return this.status >= 500;
  }
}

/* ── Transport ───────────────────────────────────────────────────────────── */

/**
 * Aborts on whichever comes first: React Query cancelling the query, or our own
 * timeout. Written by hand rather than with `AbortSignal.any`, which Safari only
 * shipped in 17.4.
 */
function linkedTimeoutSignal(upstream: AbortSignal | undefined, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), ms);
  const forward = () => controller.abort(upstream?.reason);

  if (upstream) {
    if (upstream.aborted) forward();
    else upstream.addEventListener("abort", forward, { once: true });
  }

  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      upstream?.removeEventListener("abort", forward);
    },
    timedOut: () => controller.signal.aborted && !upstream?.aborted,
  };
}

async function getJson<T>(path: string, upstream?: AbortSignal): Promise<T> {
  const link = linkedTimeoutSignal(upstream, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      signal: link.signal,
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new MarketApiError(
        response.status === 429
          ? "Rate limit reached. Data will refresh shortly."
          : "Market data is temporarily unavailable.",
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof MarketApiError) throw error;
    // Don't convert a deliberate cancellation into a user-facing failure.
    if (upstream?.aborted) throw error;
    if (link.timedOut()) {
      throw new MarketApiError("The request took too long. Please try again.");
    }
    throw new MarketApiError("Market data is temporarily unavailable.");
  } finally {
    link.done();
  }
}

/* ── Normalisation ───────────────────────────────────────────────────────── */

/**
 * Coerces to a finite number or null. Deliberately never falls back to 0 — a
 * missing market cap is not a market cap of zero, and the UI renders null as an
 * em dash.
 */
function num(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function epoch(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function assetLogoUrl(id: string): string {
  return `${LOGO_BASE}/${id}/logo.png`;
}

/** Raw ticker shape, narrowed to the fields we read. */
interface RawTicker {
  id?: unknown;
  name?: unknown;
  symbol?: unknown;
  rank?: unknown;
  last_updated?: unknown;
  quotes?: { USD?: Record<string, unknown> };
}

export function normalizeAsset(raw: RawTicker, fallbackRank: number): Asset | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;

  const usd = raw.quotes?.USD ?? {};
  const rank = num(raw.rank);

  return {
    id,
    name: typeof raw.name === "string" ? raw.name : id,
    symbol: typeof raw.symbol === "string" ? raw.symbol.toUpperCase() : "—",
    // Rank 0 means "unranked" upstream; fall back to list position so sorting
    // stays stable instead of collapsing every unranked asset onto 0.
    rank: rank && rank > 0 ? rank : fallbackRank,
    logoUrl: assetLogoUrl(id),
    price: num(usd.price),
    marketCap: num(usd.market_cap),
    volume24h: num(usd.volume_24h),
    change24h: num(usd.percent_change_24h),
    lastUpdated: epoch(raw.last_updated),
  };
}

interface RawGlobal {
  market_cap_usd?: unknown;
  market_cap_change_24h?: unknown;
  volume_24h_usd?: unknown;
  bitcoin_dominance_percentage?: unknown;
  cryptocurrencies_number?: unknown;
}

export function normalizeGlobal(raw: RawGlobal): GlobalMarket {
  return {
    marketCap: num(raw.market_cap_usd),
    marketCapChange24h: num(raw.market_cap_change_24h),
    volume24h: num(raw.volume_24h_usd),
    btcDominance: num(raw.bitcoin_dominance_percentage),
    assetCount: num(raw.cryptocurrencies_number),
  };
}

interface RawHistoryPoint {
  timestamp?: unknown;
  price?: unknown;
}

export function normalizeHistory(raw: RawHistoryPoint[]): PricePoint[] {
  const points: PricePoint[] = [];
  for (const entry of raw ?? []) {
    const x = epoch(entry.timestamp);
    const y = num(entry.price);
    if (x !== null && y !== null) points.push({ x, y });
  }
  // The provider returns ascending order, but the chart's binary search depends
  // on it, so don't take that on trust.
  return points.sort((a, b) => a.x - b.x);
}

/* ── Endpoints ───────────────────────────────────────────────────────────── */

/**
 * Global totals. Can't be derived from the top 50: total market cap and BTC
 * dominance are shares of ~12,500 assets, so computing them from 50 rows would
 * be wrong, not merely approximate.
 */
export async function getGlobalMarketData(signal?: AbortSignal): Promise<GlobalMarket> {
  return normalizeGlobal(await getJson<RawGlobal>("/global", signal));
}

/** The whole market list in one request — never one request per asset. */
export async function getTopAssets(
  limit = TOP_ASSET_COUNT,
  signal?: AbortSignal,
): Promise<Asset[]> {
  const raw = await getJson<RawTicker[]>(`/tickers?quotes=USD&limit=${limit}`, signal);
  if (!Array.isArray(raw)) throw new MarketApiError("Market data is temporarily unavailable.");

  const assets: Asset[] = [];
  raw.forEach((ticker, index) => {
    const asset = normalizeAsset(ticker, index + 1);
    if (asset) assets.push(asset);
  });
  return assets.sort((a, b) => a.rank - b.rank);
}

/** ISO start bound for a range, clamped inside the free tier's window. */
export function rangeStart(range: RangeConfig, now = Date.now()): string {
  const start = new Date(now - range.hours * 3_600_000);
  return range.interval === "1h"
    ? start.toISOString().slice(0, 19) + "Z"
    : start.toISOString().slice(0, 10);
}

/** Price history for a single asset — the only per-asset request in the app. */
export async function getAssetHistory(
  assetId: string,
  rangeId: RangeId,
  signal?: AbortSignal,
): Promise<PricePoint[]> {
  const range = getRange(rangeId);
  const raw = await getJson<RawHistoryPoint[]>(
    `/tickers/${encodeURIComponent(assetId)}/historical?start=${rangeStart(range)}&interval=${range.interval}`,
    signal,
  );
  if (!Array.isArray(raw)) throw new MarketApiError("Price history is unavailable for this asset.");
  return normalizeHistory(raw);
}
