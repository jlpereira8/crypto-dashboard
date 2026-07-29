import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { Asset, PricePoint, RangeId } from "./market-api";
import { SAMPLE_HOLDINGS, valuePortfolio, type Holding } from "./portfolio";
import { assetHistoryQuery, useTopAssets } from "./useMarketData";

/**
 * The portfolio, valued against live market data.
 *
 * Prices come from the top-50 response the rest of the app already loads, so
 * valuation itself costs no extra request — and if the user arrived from the
 * dashboard it is already in cache.
 */
export function usePortfolioValuation(holdings: readonly Holding[] = SAMPLE_HOLDINGS) {
  const { assets, isLoading, isError, isRefreshing, refetch } = useTopAssets();

  const assetsById = useMemo(() => {
    const map = new Map<string, Asset>();
    for (const asset of assets ?? []) map.set(asset.id, asset);
    return map;
  }, [assets]);

  const valuation = useMemo(
    () => valuePortfolio(holdings, assetsById),
    [holdings, assetsById],
  );

  return { valuation, isLoading, isError, isRefreshing, refetch };
}

export interface PortfolioHistory {
  points: PricePoint[];
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  /** Holdings whose history failed, so the chart can say the curve is partial. */
  missing: string[];
}

/**
 * Portfolio value over time.
 *
 * One history request per holding — the only place in the app that fans out. It
 * reuses the same query keys as the dashboard chart, so any range already viewed
 * there is free, and React Query dedupes the rest.
 *
 * Series arrive on different timestamp grids (an asset listed later has fewer
 * points), so this walks the union of all timestamps and carries each asset's
 * last known price forward. Step-carry, not interpolation: a price is a fact at
 * a moment, and inventing intermediate values would smooth the curve with data
 * that never existed. Timestamps before an asset's first point contribute
 * nothing, which is correct — it wasn't held yet.
 */
export function usePortfolioHistory(
  holdings: readonly Holding[],
  range: RangeId,
): PortfolioHistory {
  const results = useQueries({
    // Same query keys as the dashboard chart, so a range already viewed there
    // costs nothing here.
    queries: holdings.map((holding) => assetHistoryQuery(holding.id, range)),
    combine: (queries) => ({
      series: queries.map((query) => query.data ?? null),
      isLoading: queries.some((query) => query.isPending),
      isError: queries.length > 0 && queries.every((query) => query.isError),
      isRefreshing: queries.some((query) => query.isFetching && !query.isPending),
      failed: queries.map((query) => query.isError),
    }),
  });

  const points = useMemo(() => {
    const usable = holdings
      .map((holding, index) => ({ holding, series: results.series[index] }))
      .filter((entry): entry is { holding: Holding; series: PricePoint[] } =>
        Boolean(entry.series?.length),
      );

    if (usable.length === 0) return [];

    const timestamps = [...new Set(usable.flatMap((entry) => entry.series.map((p) => p.x)))].sort(
      (a, b) => a - b,
    );

    // One cursor per asset so the whole walk stays linear rather than searching
    // each series at every timestamp.
    const cursors = new Array<number>(usable.length).fill(0);
    const lastPrice = new Array<number | null>(usable.length).fill(null);

    return timestamps.map((timestamp) => {
      let total = 0;
      usable.forEach((entry, index) => {
        const series = entry.series;
        while (cursors[index] < series.length && series[cursors[index]].x <= timestamp) {
          lastPrice[index] = series[cursors[index]].y;
          cursors[index] += 1;
        }
        const price = lastPrice[index];
        if (price !== null) total += entry.holding.units * price;
      });
      return { x: timestamp, y: total };
    });
  }, [holdings, results.series]);

  const missing = useMemo(
    () => holdings.filter((_, index) => results.failed[index]).map((holding) => holding.symbol),
    [holdings, results.failed],
  );

  return {
    points,
    isLoading: results.isLoading,
    isError: results.isError,
    isRefreshing: results.isRefreshing,
    missing,
  };
}
