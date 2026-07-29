import { useCallback, useId, useMemo, useState } from "react";
import Head from "next/head";
import { motion } from "framer-motion";
import { cn } from "../lib/cn";
import { formatInteger } from "../lib/format";
import {
  DEFAULT_SORT,
  deriveMarketView,
  type MarketSort,
  type MarketSortKey,
  type SortDirection,
} from "../lib/market-view";
import { fadeUp, transition } from "../lib/motion";
import { useTopAssets } from "../lib/useMarketData";
import { useWatchlist } from "../lib/useWatchlist";
import { MarketsMobileList, MarketsTable } from "../components/markets/MarketsTable";
import {
  AlertIcon,
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  SearchIcon,
} from "../components/ui";

const PAGE_SIZE = 15;

/**
 * The tabs, and what each one means.
 *
 * "Trending" is defined here rather than taken from the provider, which exposes no
 * trending signal. It ranks by turnover — 24h volume as a share of market cap —
 * which surfaces assets trading unusually heavily for their size. The label says
 * so on screen; a made-up proprietary score would not be honest.
 */
type MarketTab = "all" | "watchlist" | "gainers" | "losers" | "trending";

const TABS: readonly { id: MarketTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "watchlist", label: "Watchlist" },
  { id: "gainers", label: "Top gainers" },
  { id: "losers", label: "Top losers" },
  { id: "trending", label: "Trending" },
];

const TAB_HINTS: Record<MarketTab, string | null> = {
  all: null,
  watchlist: null,
  gainers: "Ranked by 24-hour gain",
  losers: "Ranked by 24-hour loss",
  trending: "Ranked by turnover — 24h volume relative to market cap",
};

export default function MarketsPage() {
  const { assets, isLoading, isError, isRefreshing, refetch } = useTopAssets();
  const watchlist = useWatchlist();

  const [tab, setTab] = useState<MarketTab>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<MarketSort>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const searchId = `${useId()}-markets-search`;

  /**
   * The tab narrows the pool, then the shared derivation does search, sort and
   * pagination over it — so the two concerns compose instead of duplicating.
   */
  const pool = useMemo(() => {
    const all = assets ?? [];
    switch (tab) {
      case "watchlist":
        return all.filter((asset) => watchlist.ids.includes(asset.id));
      case "gainers":
        return all.filter((asset) => (asset.change24h ?? 0) > 0);
      case "losers":
        return all.filter((asset) => (asset.change24h ?? 0) < 0);
      default:
        return all;
    }
  }, [assets, tab, watchlist.ids]);

  /** Tabs that imply a ranking keep it until the user clicks a column. */
  const effectiveSort = useMemo<MarketSort>(() => {
    if (sort.key !== DEFAULT_SORT.key) return sort;
    if (tab === "gainers") return { key: "change24h", direction: "desc" };
    if (tab === "losers") return { key: "change24h", direction: "asc" };
    if (tab === "trending") return { key: "turnover", direction: "desc" };
    return sort;
  }, [sort, tab]);

  const view = useMemo(
    () =>
      deriveMarketView({
        assets: pool,
        search,
        // The tab already narrowed the pool; keep the shared filter neutral.
        filter: "all",
        sort: effectiveSort,
        page,
        pageSize: PAGE_SIZE,
      }),
    [pool, search, effectiveSort, page],
  );

  const onSort = useCallback((key: MarketSortKey) => {
    setPage(0);
    setSort((current) => {
      if (current.key !== key) return { key, direction: key === "rank" ? "asc" : "desc" };
      if (current.direction === "desc") return { key, direction: "asc" };
      return DEFAULT_SORT;
    });
  }, []);

  const directionFor = useCallback(
    (key: MarketSortKey): SortDirection | null =>
      effectiveSort.key === key ? effectiveSort.direction : null,
    [effectiveSort],
  );

  const changeTab = useCallback((next: MarketTab) => {
    setTab(next);
    setPage(0);
  }, []);

  const hint = TAB_HINTS[tab];
  const isEmpty = !isLoading && view.total === 0;

  return (
    <>
      <Head>
        <title>Markets — CryptoBay</title>
        <meta
          name="description"
          content="Search, sort and filter the top cryptocurrencies by market capitalisation."
        />
      </Head>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={transition.base}>
        <PageHeader
          title="Markets"
          description="Every tracked asset, sorted however you need it. Search, filter and star the ones you follow — all of it runs on the market data already loaded, so nothing here refetches."
          actions={
            <Button
              variant="secondary"
              size="sm"
              loading={isRefreshing}
              onClick={() => void refetch()}
            >
              Refresh
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div role="tablist" aria-label="Market filters" className="flex flex-wrap items-center gap-1">
              {TABS.map((entry) => {
                const active = tab === entry.id;
                const count = entry.id === "watchlist" ? watchlist.count : null;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => changeTab(entry.id)}
                    className={cn(
                      "focus-ring flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
                      "transition-colors duration-fast",
                      active
                        ? "bg-accent-soft text-accent-text"
                        : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
                    )}
                  >
                    {entry.label}
                    {count !== null && count > 0 && (
                      <Badge size="sm" tone={active ? "accent" : "neutral"}>
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto w-full sm:w-56">
              <label htmlFor={searchId} className="sr-only">
                Search assets by name or symbol
              </label>
              <Input
                id={searchId}
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Search name or symbol"
                leading={<SearchIcon />}
              />
            </div>
          </div>

          {hint && <p className="mt-2 text-micro uppercase text-ink-muted">{hint}</p>}
        </PageHeader>

        <section
          aria-label="Market list"
          aria-busy={isRefreshing && !isLoading ? true : undefined}
          className={cn(
            "border-b border-line bg-surface transition-opacity duration-base",
            isRefreshing && !isLoading && "opacity-[0.55]",
          )}
        >
          {isError && !assets ? (
            <EmptyState
              tone="error"
              icon={<AlertIcon />}
              title="Market data is temporarily unavailable"
              description="The request didn't go through. This is usually a brief rate limit."
              action={
                <Button size="sm" variant="secondary" onClick={() => void refetch()}>
                  Try again
                </Button>
              }
            />
          ) : isEmpty ? (
            <EmptyState
              icon={<SearchIcon />}
              title={
                tab === "watchlist" && !search.trim()
                  ? "Your watchlist is empty"
                  : "No assets match your search"
              }
              description={
                tab === "watchlist" && !search.trim()
                  ? "Star an asset in any market list to keep an eye on it. Your watchlist is stored in this browser."
                  : search.trim()
                    ? `Nothing matches “${search.trim()}”. Try a different name or symbol.`
                    : "No assets match the selected filter."
              }
              action={
                tab === "watchlist" && !search.trim() ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button size="sm" variant="primary" onClick={watchlist.restoreDefaults}>
                      Restore defaults
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => changeTab("all")}>
                      Browse all markets
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      changeTab("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <>
              <MarketsTable
                rows={view.rows}
                isLoading={isLoading}
                directionFor={directionFor}
                onSort={onSort}
                isWatched={watchlist.has}
                onToggleWatch={watchlist.toggle}
              />
              <MarketsMobileList
                rows={view.rows}
                isLoading={isLoading}
                isWatched={watchlist.has}
                onToggleWatch={watchlist.toggle}
              />

              {!isLoading && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 sm:px-6">
                  <Pagination
                    page={view.page}
                    pageCount={view.pageCount}
                    pageSize={PAGE_SIZE}
                    totalItems={view.total}
                    onPageChange={setPage}
                    itemLabel="assets"
                    className="w-full sm:w-auto sm:flex-1"
                  />
                  {isError && assets && (
                    <span className="text-micro uppercase text-negative">Last known prices</span>
                  )}
                  {watchlist.count > 0 && (
                    <span className="text-micro uppercase text-ink-muted nums-tabular">
                      {formatInteger(watchlist.count)} starred
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </motion.div>
    </>
  );
}
