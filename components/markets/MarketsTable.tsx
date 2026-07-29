import React from "react";
import { cn } from "../../lib/cn";
import { formatCurrencyCompact, formatPrice } from "../../lib/format";
import type { Asset } from "../../lib/market-api";
import type { MarketSortKey } from "../../lib/market-view";
import {
  DeltaPill,
  SortableHeaderCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableScroll,
  Tooltip,
  type SortDirection,
} from "../ui";
import { CoinMark } from "../dashboard/CoinMark";

export interface MarketsTableProps {
  rows: Asset[];
  isLoading: boolean;
  skeletonRows?: number;
  directionFor: (key: MarketSortKey) => SortDirection | null;
  onSort: (key: MarketSortKey) => void;
  isWatched: (id: string) => boolean;
  onToggleWatch: (id: string) => void;
  /** Bound height for the sticky header to pin against. */
  maxHeight?: string;
}

/**
 * The full markets table: watchlist star, six sortable columns, sticky header.
 *
 * Kept separate from the dashboard's compact explorer rather than bolted onto it
 * with a `variant` prop — the two want different columns, different densities and
 * different affordances, and the logic they genuinely share (`deriveMarketView`,
 * the row primitives, `CoinMark`, `DeltaPill`) is already shared at the level
 * where sharing pays.
 *
 * There is no sparkline column: the provider does not return price arrays in the
 * markets response, and the only way to draw fifty of them is fifty requests.
 */
export function MarketsTable({
  rows,
  isLoading,
  skeletonRows = 10,
  directionFor,
  onSort,
  isWatched,
  onToggleWatch,
  maxHeight,
}: MarketsTableProps) {
  return (
    <TableScroll maxHeight={maxHeight} className="hidden md:block">
      <Table>
        <caption className="sr-only">
          Cryptocurrencies by market capitalisation. Column headers are buttons that change the
          sort order, and each row has a button to add the asset to your watchlist.
        </caption>
        <TableHead>
          <tr>
            <TableHeaderCell className="w-9">
              <span className="sr-only">Watchlist</span>
            </TableHeaderCell>
            <SortableHeaderCell
              label="#"
              srLabel="Rank"
              className="w-14"
              direction={directionFor("rank")}
              onSort={() => onSort("rank")}
            />
            <TableHeaderCell>Asset</TableHeaderCell>
            <SortableHeaderCell
              label="Price"
              align="right"
              direction={directionFor("price")}
              onSort={() => onSort("price")}
            />
            <SortableHeaderCell
              label="24h"
              align="right"
              direction={directionFor("change24h")}
              onSort={() => onSort("change24h")}
            />
            <SortableHeaderCell
              label="Market cap"
              align="right"
              direction={directionFor("marketCap")}
              onSort={() => onSort("marketCap")}
            />
            <SortableHeaderCell
              label="Volume 24h"
              align="right"
              direction={directionFor("volume24h")}
              onSort={() => onSort("volume24h")}
            />
          </tr>
        </TableHead>

        <TableBody>
          {isLoading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index} aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                    <TableCell key={cell} align={cell > 2 ? "right" : "left"}>
                      <span
                        className="inline-block h-2.5 animate-pulse rounded-sm bg-surface-subtle align-middle"
                        style={{ width: cell === 2 ? "7rem" : cell === 0 ? "1rem" : "4rem" }}
                      />
                    </TableCell>
                  ))}
                </tr>
              ))
            : rows.map((asset) => (
                <tr
                  key={asset.id}
                  className="group transition-colors duration-fast hover:bg-surface-hover"
                >
                  <TableCell>
                    <WatchButton
                      active={isWatched(asset.id)}
                      name={asset.name}
                      onClick={() => onToggleWatch(asset.id)}
                    />
                  </TableCell>
                  <TableCell className="text-2xs text-ink-muted nums-tabular">
                    {asset.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CoinMark src={asset.logoUrl} symbol={asset.symbol} />
                      <span className="truncate text-sm font-medium text-ink">{asset.name}</span>
                      <span className="shrink-0 text-micro font-medium uppercase text-ink-muted">
                        {asset.symbol}
                      </span>
                    </div>
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
              ))}
        </TableBody>
      </Table>
    </TableScroll>
  );
}

/**
 * Watchlist toggle.
 *
 * `aria-pressed` carries the state and the accessible name names the asset, so a
 * screen-reader user hearing fifty of these can tell them apart. The star is
 * filled when active and outlined when not, so state survives greyscale.
 */
export function WatchButton({
  active,
  name,
  onClick,
  className,
}: {
  active: boolean;
  name: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Tooltip content={active ? "Remove from watchlist" : "Add to watchlist"}>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "focus-ring grid h-6 w-6 place-items-center rounded transition-colors duration-fast",
          active
            ? "text-accent-text hover:bg-accent-soft"
            : "text-ink-muted hover:bg-surface-subtle hover:text-ink-secondary",
          className,
        )}
      >
        <span className="sr-only">
          {active ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
        </span>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            d="M8 1.75l1.87 3.94 4.13.58-3 3.02.72 4.21L8 11.5l-3.72 2 .72-4.21-3-3.02 4.13-.58L8 1.75Z"
            fill={active ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </Tooltip>
  );
}

/** Compact selectable row for narrow viewports. */
export function MarketsMobileList({
  rows,
  isLoading,
  isWatched,
  onToggleWatch,
  skeletonRows = 10,
}: Pick<MarketsTableProps, "rows" | "isLoading" | "isWatched" | "onToggleWatch"> & {
  skeletonRows?: number;
}) {
  return (
    <ul className="divide-y divide-line-subtle md:hidden">
      {isLoading
        ? Array.from({ length: skeletonRows }, (_, index) => (
            <li key={index} className="flex items-center gap-2.5 px-4 py-2.5" aria-hidden="true">
              <span className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-surface-subtle" />
              <span className="h-2.5 flex-1 animate-pulse rounded-sm bg-surface-subtle" />
              <span className="h-2.5 w-14 animate-pulse rounded-sm bg-surface-subtle" />
            </li>
          ))
        : rows.map((asset) => (
            <li key={asset.id} className="flex items-center gap-2 px-3 py-2.5">
              <WatchButton
                active={isWatched(asset.id)}
                name={asset.name}
                onClick={() => onToggleWatch(asset.id)}
              />
              <span className="w-5 shrink-0 text-micro text-ink-muted nums-tabular">
                {asset.rank}
              </span>
              <CoinMark src={asset.logoUrl} symbol={asset.symbol} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-tight text-ink">
                  {asset.name}
                </span>
                <span className="block text-micro uppercase leading-tight text-ink-muted">
                  {asset.symbol} · {formatCurrencyCompact(asset.marketCap)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-medium leading-tight text-ink nums-tabular">
                  {formatPrice(asset.price)}
                </span>
                <DeltaPill value={asset.change24h} size="sm" bare className="mt-0.5 justify-end" />
              </span>
            </li>
          ))}
    </ul>
  );
}
