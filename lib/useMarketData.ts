import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getAssetHistory,
  getGlobalMarketData,
  getTopAssets,
  MarketApiError,
  TOP_ASSET_COUNT,
  type Asset,
  type RangeId,
} from "./market-api";

/**
 * React Query wiring.
 *
 * Three queries total, and that's the whole budget:
 *   1. top assets  — one request, drives the table, the KPI fallbacks and the
 *      chart header
 *   2. asset history — one request, only for the selected asset
 *   3. global stats — one request, not derivable from 50 of ~12,500 assets
 *
 * Sorting, searching, filtering and paginating the table never refetch; see
 * lib/market-view.ts.
 */

/** Market data moves about once a minute upstream, so refetching sooner is waste. */
const STALE_TIME = 60_000;
const GC_TIME = 10 * 60_000;

const shared = {
  staleTime: STALE_TIME,
  gcTime: GC_TIME,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  // Two attempts, but never against an error that can't succeed on retry.
  retry: (attempt: number, error: unknown) =>
    error instanceof MarketApiError ? error.isRetryable && attempt < 2 : attempt < 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 6000),
} as const;

export function useTopAssets() {
  const query = useQuery({
    ...shared,
    queryKey: ["top-assets", TOP_ASSET_COUNT],
    queryFn: ({ signal }) => getTopAssets(TOP_ASSET_COUNT, signal),
  });

  return {
    assets: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    /** True while refreshing over data we're still showing. */
    isRefreshing: query.isFetching && !query.isPending,
    refetch: query.refetch,
  };
}

export function useGlobalMarket() {
  const query = useQuery({
    ...shared,
    queryKey: ["global-market"],
    queryFn: ({ signal }) => getGlobalMarketData(signal),
  });

  return {
    global: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    isRefreshing: query.isFetching && !query.isPending,
    refetch: query.refetch,
  };
}

/**
 * Price history for the selected asset and range.
 *
 * The key includes both, so every asset/range pair a user visits stays in cache
 * for `GC_TIME` and switching back is instant. `keepPreviousData` holds the
 * outgoing series on screen while the next one loads, so the card dims instead
 * of collapsing to a skeleton — except on an asset change, where a skeleton is
 * correct because the previous asset's prices would be actively misleading.
 */
export function useAssetHistory(assetId: string | undefined, range: RangeId) {
  const query = useQuery({
    ...shared,
    queryKey: ["asset-history", assetId, range],
    queryFn: ({ signal }) => getAssetHistory(assetId as string, range, signal),
    enabled: Boolean(assetId),
    placeholderData: keepPreviousData,
  });

  return {
    points: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    isRefreshing: query.isFetching && !query.isPending,
    refetch: query.refetch,
  };
}

/** Looks up the selected asset in the already-loaded list — no extra request. */
export function findAsset(assets: Asset[] | undefined, id: string | undefined): Asset | undefined {
  if (!assets || !id) return undefined;
  return assets.find((asset) => asset.id === id);
}
