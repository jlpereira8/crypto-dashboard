import type { Asset } from "./market-api";

/**
 * Client-side derivation for the Market Explorer.
 *
 * Search, filtering, sorting and pagination all run over the already-loaded top
 * 50 — none of them triggers a request. Kept as a pure function so it can be
 * tested directly and memoised by the component with no hidden state.
 */

export type MarketFilter = "all" | "gainers" | "losers" | "volume";
export type MarketSortKey =
  | "rank"
  | "price"
  | "change24h"
  | "marketCap"
  | "volume24h"
  /** 24h volume as a share of market cap — how heavily an asset trades for its size. */
  | "turnover";
export type SortDirection = "asc" | "desc";

export interface MarketSort {
  key: MarketSortKey;
  direction: SortDirection;
}

export const MARKET_FILTERS: readonly { id: MarketFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
  { id: "volume", label: "Highest volume" },
];

export const DEFAULT_SORT: MarketSort = { key: "rank", direction: "asc" };
export const PAGE_SIZE = 10;

const ACCESSORS: Record<MarketSortKey, (asset: Asset) => number> = {
  rank: (asset) => asset.rank,
  price: (asset) => asset.price ?? -Infinity,
  change24h: (asset) => asset.change24h ?? -Infinity,
  marketCap: (asset) => asset.marketCap ?? -Infinity,
  volume24h: (asset) => asset.volume24h ?? -Infinity,
  // Guarded against a zero or missing cap, which would divide to Infinity and
  // pin an unranked asset to the top of the list.
  turnover: (asset) =>
    asset.volume24h && asset.marketCap && asset.marketCap > 0
      ? asset.volume24h / asset.marketCap
      : -Infinity,
};

export interface MarketViewInput {
  assets: Asset[];
  search: string;
  filter: MarketFilter;
  sort: MarketSort;
  page: number;
  pageSize?: number;
}

export interface MarketView {
  /** The page the caller should render. */
  rows: Asset[];
  /** Rows surviving search + filter, before pagination. */
  total: number;
  pageCount: number;
  /** Clamped into range, so an out-of-range input can't render an empty page. */
  page: number;
}

function matchesSearch(asset: Asset, needle: string): boolean {
  if (!needle) return true;
  return (
    asset.name.toLowerCase().includes(needle) || asset.symbol.toLowerCase().includes(needle)
  );
}

function matchesFilter(asset: Asset, filter: MarketFilter): boolean {
  switch (filter) {
    case "gainers":
      return (asset.change24h ?? 0) > 0;
    case "losers":
      return (asset.change24h ?? 0) < 0;
    // "Highest volume" is an ordering, not an exclusion — it keeps every asset
    // and lets the sort below do the work.
    case "volume":
    case "all":
    default:
      return true;
  }
}

export function deriveMarketView({
  assets,
  search,
  filter,
  sort,
  page,
  pageSize = PAGE_SIZE,
}: MarketViewInput): MarketView {
  const needle = search.trim().toLowerCase();

  const matched = assets.filter(
    (asset) => matchesSearch(asset, needle) && matchesFilter(asset, filter),
  );

  // The volume tab implies its own ordering unless the user has picked a column.
  const effectiveSort: MarketSort =
    filter === "volume" && sort.key === DEFAULT_SORT.key
      ? { key: "volume24h", direction: "desc" }
      : sort;

  const accessor = ACCESSORS[effectiveSort.key];
  const factor = effectiveSort.direction === "asc" ? 1 : -1;

  const sorted = [...matched].sort((a, b) => {
    const delta = (accessor(a) - accessor(b)) * factor;
    // Rank is the stable tiebreaker so equal values never reorder between renders.
    return delta !== 0 ? delta : a.rank - b.rank;
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);

  return {
    rows: sorted.slice(safePage * pageSize, safePage * pageSize + pageSize),
    total: sorted.length,
    pageCount,
    page: safePage,
  };
}

/**
 * Percentage change across a price series.
 *
 * Derived from the same points the chart draws rather than read from a
 * provider field, so the header figure and the line can never disagree — and it
 * covers 90D, for which CoinPaprika has no percent-change field at all.
 */
export function seriesChangePct(points: { y: number }[]): number | null {
  if (points.length < 2) return null;
  const first = points[0].y;
  const last = points[points.length - 1].y;
  if (!Number.isFinite(first) || first === 0) return null;
  return ((last - first) / first) * 100;
}

/**
 * The strongest movers over 24h, largest absolute change first.
 *
 * Derived from the already-loaded top-50 list, so the Top Gainers panel costs no
 * request. Assets with no change figure are excluded rather than treated as flat
 * — a missing percentage is not a 0% move.
 */
export function topMovers(
  assets: Asset[] | undefined,
  direction: "gainers" | "losers",
  count = 5,
): Asset[] {
  const sign = direction === "gainers" ? 1 : -1;
  return (assets ?? [])
    .filter((asset) => {
      const change = asset.change24h;
      return typeof change === "number" && Number.isFinite(change) && change * sign > 0;
    })
    .sort((a, b) => ((b.change24h ?? 0) - (a.change24h ?? 0)) * sign)
    .slice(0, count);
}

export interface MarketBreadth {
  advancing: number;
  declining: number;
  flat: number;
  /** Assets with a usable 24h figure. Excludes those the provider left null. */
  measured: number;
  /** Share of measured assets that are up, 0–100. */
  advancingShare: number | null;
  /** Mean 24h change across measured assets. */
  averageChangePct: number | null;
}

/**
 * Market breadth over the loaded list.
 *
 * The honest version of a sentiment gauge: how many assets are up versus down,
 * and by how much on average. Every figure is counted from data already on the
 * page, so it costs no request — and unlike a proprietary "fear and greed" score,
 * the reader can see exactly what it measures.
 *
 * Assets with no 24h figure are excluded from every count rather than filed as
 * flat, so `advancing + declining + flat === measured`, which may be fewer than
 * the assets supplied.
 */
export function marketBreadth(assets: Asset[] | undefined): MarketBreadth {
  let advancing = 0;
  let declining = 0;
  let flat = 0;
  let sum = 0;

  for (const asset of assets ?? []) {
    const change = asset.change24h;
    if (typeof change !== "number" || !Number.isFinite(change)) continue;
    sum += change;
    if (change > 0) advancing += 1;
    else if (change < 0) declining += 1;
    else flat += 1;
  }

  const measured = advancing + declining + flat;

  return {
    advancing,
    declining,
    flat,
    measured,
    advancingShare: measured > 0 ? (advancing / measured) * 100 : null,
    averageChangePct: measured > 0 ? sum / measured : null,
  };
}

/** Low/high across a series, for the chart footer. */
export function seriesExtent(points: { y: number }[]): { low: number | null; high: number | null } {
  if (points.length === 0) return { low: null, high: null };
  let low = points[0].y;
  let high = points[0].y;
  for (const point of points) {
    if (point.y < low) low = point.y;
    if (point.y > high) high = point.y;
  }
  return { low, high };
}
