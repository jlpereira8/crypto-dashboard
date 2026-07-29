import React, { useCallback, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { formatCurrencyCompact, formatInteger, formatPrice } from "../../lib/format";
import type { Asset } from "../../lib/market-api";
import {
  DEFAULT_SORT,
  MARKET_FILTERS,
  PAGE_SIZE,
  deriveMarketView,
  type MarketFilter,
  type MarketSort,
  type MarketSortKey,
} from "../../lib/market-view";
import {
  AlertIcon,
  Button,
  CardTitle,
  DeltaPill,
  EmptyState,
  Input,
  Pagination,
  SearchIcon,
  SortableHeaderCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableScroll,
  type SortDirection,
} from "../ui";
import { CoinMark } from "./CoinMark";

const SKELETON_ROWS = 6;
/** Rows shown before the list is expanded. */
const PREVIEW_ROWS = 6;

export interface MarketExplorerProps {
  assets: Asset[] | undefined;
  selectedId: string | undefined;
  onSelect: (assetId: string) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Market Explorer — the top 50, browsable.
 *
 * Visually restructured: the title, filter tabs and search now share a single
 * toolbar row instead of stacking into three separate bands, which returned about
 * 90px of vertical space to the rows themselves. Rows are ~40px, dividers are the
 * subtle weight, and the 24h column is bare tabular numerals rather than forty
 * tinted chips.
 *
 * Every interaction still derives from the one already-loaded list; nothing here
 * refetches.
 */
export function MarketExplorer({
  assets,
  selectedId,
  onSelect,
  isLoading,
  isRefreshing,
  isError,
  onRetry,
}: MarketExplorerProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MarketFilter>("all");
  const [sort, setSort] = useState<MarketSort>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  /**
   * Collapsed by default. A ten-row table plus pagination made this panel the
   * tallest thing on the page and pushed the wallet below the fold; a six-row
   * preview with an expand affordance keeps every row reachable without letting
   * the table dominate.
   */
  const [expanded, setExpanded] = useState(false);
  const searchId = `${useId()}-market-search`;

  const pageSize = expanded ? PAGE_SIZE : PREVIEW_ROWS;

  const view = useMemo(
    // Collapsed shows the head of the list, so there is no page to be on.
    () => deriveMarketView({ assets: assets ?? [], search, filter, sort, page: expanded ? page : 0, pageSize }),
    [assets, search, filter, sort, page, expanded, pageSize],
  );

  const toggleSort = useCallback((key: MarketSortKey) => {
    setPage(0);
    setSort((current) => {
      // First activation on a numeric column shows the largest values first.
      if (current.key !== key) return { key, direction: key === "rank" ? "asc" : "desc" };
      if (current.direction === "desc") return { key, direction: "asc" };
      return DEFAULT_SORT;
    });
  }, []);

  const directionFor = (key: MarketSortKey): SortDirection | null =>
    sort.key === key ? sort.direction : null;

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const onFilterChange = useCallback((next: MarketFilter) => {
    setFilter(next);
    setPage(0);
  }, []);

  const showEmptySearch = !isLoading && !isError && view.total === 0;

  return (
    <section
      aria-label="Market explorer"
      aria-busy={isRefreshing && !isLoading ? true : undefined}
      className={cn(
        "bg-surface transition-opacity duration-base",
        isRefreshing && !isLoading && "opacity-[0.55]",
      )}
    >
      {/* ── One toolbar: title, tabs, search ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-baseline gap-2">
          <CardTitle>Market Explorer</CardTitle>
          {/* Only worth showing when something is actually narrowing the list —
              otherwise it just restates the footer's own count. */}
          {(isLoading || view.total !== (assets?.length ?? 0)) && (
            <span className="shrink-0 text-micro uppercase text-ink-muted nums-tabular">
              {isLoading
                ? "Loading"
                : `${formatInteger(view.total)} of ${formatInteger(assets?.length ?? 0)}`}
            </span>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Filter assets"
          className="scrollbar-slim -mx-1 flex items-center gap-0.5 overflow-x-auto px-1"
        >
          {MARKET_FILTERS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFilterChange(tab.id)}
                className={cn(
                  "focus-ring shrink-0 rounded px-2 py-1 text-2xs font-medium tracking-normal",
                  "transition-colors duration-fast",
                  active
                    ? "bg-accent-soft text-accent-text"
                    : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto w-full sm:w-auto">
          <label htmlFor={searchId} className="sr-only">
            Search assets by name or symbol
          </label>
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="sm:w-44"
            leading={<SearchIcon />}
          />
        </div>
      </div>

      {isError && !assets ? (
        <EmptyState
          tone="error"
          icon={<AlertIcon />}
          title="Market data is temporarily unavailable"
          description="The request didn't go through. This is usually a brief rate limit."
          action={
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      ) : showEmptySearch ? (
        <EmptyState
          icon={<SearchIcon />}
          title="No assets match your search"
          description={
            search.trim()
              ? `Nothing matches “${search.trim()}”. Try a different name or symbol.`
              : "No assets match the selected filter."
          }
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onSearchChange("");
                onFilterChange("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────────────────── */}
          <TableScroll maxHeight={expanded ? "30rem" : undefined} className="hidden md:block">
            <Table>
              <caption className="sr-only">
                Top cryptocurrencies by market capitalisation. Column headers are buttons that
                change the sort order. Select a row to show that asset in the chart above.
              </caption>
              <TableHead>
                <tr>
                  <SortableHeaderCell
                    label="#"
                    srLabel="Rank"
                    direction={directionFor("rank")}
                    onSort={() => toggleSort("rank")}
                    className="w-14"
                  />
                  <TableHeaderCell>Asset</TableHeaderCell>
                  <SortableHeaderCell
                    label="Price"
                    align="right"
                    direction={directionFor("price")}
                    onSort={() => toggleSort("price")}
                  />
                  <SortableHeaderCell
                    label="24h"
                    align="right"
                    direction={directionFor("change24h")}
                    onSort={() => toggleSort("change24h")}
                  />
                  <SortableHeaderCell
                    label="Market cap"
                    align="right"
                    direction={directionFor("marketCap")}
                    onSort={() => toggleSort("marketCap")}
                  />
                  <SortableHeaderCell
                    label="Volume 24h"
                    align="right"
                    direction={directionFor("volume24h")}
                    onSort={() => toggleSort("volume24h")}
                  />
                </tr>
              </TableHead>

              <TableBody>
                {isLoading
                  ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                      <tr key={index} aria-hidden="true">
                        <TableCell>
                          <Bar width="0.875rem" />
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-surface-subtle" />
                            <Bar width="5.5rem" />
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <Bar width="4rem" />
                        </TableCell>
                        <TableCell align="right">
                          <Bar width="3rem" />
                        </TableCell>
                        <TableCell align="right">
                          <Bar width="4.5rem" />
                        </TableCell>
                        <TableCell align="right">
                          <Bar width="4.5rem" />
                        </TableCell>
                      </tr>
                    ))
                  : view.rows.map((asset) => {
                      const selected = asset.id === selectedId;
                      return (
                        <tr
                          key={asset.id}
                          data-selected={selected || undefined}
                          // Pointer convenience only — the button in the Asset
                          // cell is the accessible, keyboard-reachable control.
                          onClick={() => onSelect(asset.id)}
                          className={cn(
                            "group cursor-pointer transition-colors duration-fast",
                            selected ? "bg-accent-soft" : "hover:bg-surface-hover",
                          )}
                        >
                          <TableCell className="relative text-2xs text-ink-muted nums-tabular">
                            {/* Accent rail: present when selected, wipes in on
                                hover. The microinteraction that makes rows feel
                                like controls rather than printed output. */}
                            <span
                              aria-hidden="true"
                              className={cn(
                                "absolute inset-y-0 left-0 w-[2px] origin-center bg-accent",
                                "transition-transform duration-fast ease-out",
                                selected ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
                              )}
                            />
                            {asset.rank}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={(event) => {
                                // The row handler already fires; don't double-call.
                                event.stopPropagation();
                                onSelect(asset.id);
                              }}
                              className="focus-ring -m-0.5 flex items-center gap-2 rounded p-0.5 text-left"
                            >
                              <CoinMark src={asset.logoUrl} symbol={asset.symbol} />
                              {/* Name and symbol inline rather than stacked —
                                  same information, one line instead of two. */}
                              <span className="truncate text-sm font-medium text-ink">
                                {asset.name}
                              </span>
                              <span className="shrink-0 text-micro font-medium uppercase text-ink-muted">
                                {asset.symbol}
                              </span>
                              <span className="sr-only">
                                {selected ? " — shown in chart" : " — show in chart"}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell align="right" className="font-medium nums-tabular">
                            {formatPrice(asset.price)}
                          </TableCell>
                          <TableCell align="right">
                            <DeltaPill value={asset.change24h} size="sm" bare />
                          </TableCell>
                          <TableCell align="right" className="text-ink-secondary nums-tight">
                            {formatCurrencyCompact(asset.marketCap)}
                          </TableCell>
                          <TableCell align="right" className="text-ink-secondary nums-tight">
                            {formatCurrencyCompact(asset.volume24h)}
                          </TableCell>
                        </tr>
                      );
                    })}
              </TableBody>
            </Table>
          </TableScroll>

          {/* ── Mobile rows ───────────────────────────────────────────────── */}
          <ul className="divide-y divide-line-subtle md:hidden">
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <li key={index} className="flex items-center gap-2.5 px-4 py-2.5" aria-hidden="true">
                    <span className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-surface-subtle" />
                    <span className="flex-1 space-y-1">
                      <Bar width="5.5rem" />
                      <Bar width="3.5rem" />
                    </span>
                    <span className="space-y-1 text-right">
                      <Bar width="4rem" />
                      <Bar width="2.5rem" />
                    </span>
                  </li>
                ))
              : view.rows.map((asset) => {
                  const selected = asset.id === selectedId;
                  return (
                    <li key={asset.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelect(asset.id)}
                        className={cn(
                          "focus-ring-inset relative flex w-full items-center gap-2.5 px-4 py-2.5 text-left",
                          "transition-colors duration-fast",
                          selected ? "bg-accent-soft" : "active:bg-surface-hover",
                        )}
                      >
                        {selected && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-0 left-0 w-[2px] bg-accent"
                          />
                        )}
                        <span className="w-4 shrink-0 text-micro text-ink-muted nums-tabular">
                          {asset.rank}
                        </span>
                        <CoinMark src={asset.logoUrl} symbol={asset.symbol} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium leading-tight text-ink">
                            {asset.name}
                          </span>
                          <span className="mt-0.5 block text-micro uppercase leading-tight text-ink-muted">
                            {asset.symbol} · {formatCurrencyCompact(asset.marketCap)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-medium leading-tight text-ink nums-tabular">
                            {formatPrice(asset.price)}
                          </span>
                          <DeltaPill
                            value={asset.change24h}
                            size="sm"
                            bare
                            className="mt-0.5 justify-end"
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
          </ul>

          {!isLoading && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 sm:px-5">
              {expanded ? (
                <Pagination
                  page={view.page}
                  pageCount={view.pageCount}
                  pageSize={pageSize}
                  totalItems={view.total}
                  onPageChange={setPage}
                  itemLabel="assets"
                  className="w-full sm:w-auto sm:flex-1"
                />
              ) : (
                <p className="text-xs text-ink-muted nums-tabular">
                  Showing{" "}
                  <span className="font-medium text-ink-secondary">
                    {formatInteger(view.rows.length)}
                  </span>{" "}
                  of {formatInteger(view.total)} assets
                </p>
              )}

              <div className="flex items-center gap-3">
                {isError && assets && (
                  // Data on screen is stale but usable — say so without wiping it.
                  <span className="text-micro uppercase text-negative">Last known prices</span>
                )}
                {view.total > PREVIEW_ROWS && (
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded((value) => !value);
                      setPage(0);
                    }}
                    className={cn(
                      "focus-ring inline-flex items-center gap-1 rounded px-1.5 py-1",
                      "text-xs font-medium text-accent-text",
                      "transition-colors duration-fast hover:bg-accent-soft",
                    )}
                  >
                    {expanded ? "Show less" : `View all ${formatInteger(view.total)} markets`}
                    <svg
                      viewBox="0 0 12 12"
                      className={cn(
                        "h-2.5 w-2.5 transition-transform duration-fast",
                        expanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    >
                      <path d="M6 8 2 3.5h8L6 8Z" fill="currentColor" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Bar({ width }: { width: string }) {
  return (
    <span
      className="inline-block h-2.5 animate-pulse rounded-sm bg-surface-subtle align-middle"
      style={{ width }}
    />
  );
}
