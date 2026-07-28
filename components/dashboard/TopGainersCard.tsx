import React, { useMemo } from "react";
import { cn } from "../../lib/cn";
import { formatPrice } from "../../lib/format";
import type { Asset } from "../../lib/market-api";
import { topMovers } from "../../lib/market-view";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  DeltaPill,
  EmptyState,
  Skeleton,
} from "../ui";
import { CoinMark } from "./CoinMark";

const ROW_COUNT = 5;

export interface TopGainersCardProps {
  assets: Asset[] | undefined;
  selectedId: string | undefined;
  onSelect: (assetId: string) => void;
  isLoading: boolean;
}

/**
 * The five strongest 24h movers.
 *
 * Real data, and it costs nothing: it's derived from the same top-50 response the
 * table already has, so this panel adds zero requests. Rows are buttons that drive
 * the chart, which makes it a genuine shortcut to the page's main action rather
 * than a read-only widget.
 */
export function TopGainersCard({
  assets,
  selectedId,
  onSelect,
  isLoading,
}: TopGainersCardProps) {
  const gainers = useMemo(() => topMovers(assets, "gainers", ROW_COUNT), [assets]);

  return (
    <Card padding="none">
      <CardHeader bleed>
        <CardTitle>Top gainers</CardTitle>
        <Badge size="sm" className="uppercase">
          24h
        </Badge>
      </CardHeader>

      {isLoading ? (
        <ul className="divide-y divide-line-subtle">
          {Array.from({ length: ROW_COUNT }, (_, index) => (
            <li key={index} className="flex items-center gap-2.5 px-4 py-2" aria-hidden="true">
              <Skeleton shape="circle" className="h-5 w-5" />
              <Skeleton className="h-2.5 flex-1" />
              <Skeleton className="h-2.5 w-10" />
            </li>
          ))}
        </ul>
      ) : gainers.length === 0 ? (
        <EmptyState
          size="sm"
          title="No gainers right now"
          description="Every tracked asset is flat or down over the last 24 hours."
        />
      ) : (
        <ul className="divide-y divide-line-subtle">
          {gainers.map((asset, index) => {
            const selected = asset.id === selectedId;
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(asset.id)}
                  className={cn(
                    "focus-ring-inset group relative flex w-full items-center gap-2.5 px-4 py-2 text-left",
                    "transition-colors duration-fast",
                    selected ? "bg-accent-soft" : "hover:bg-surface-hover",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-0 left-0 w-[2px] origin-center bg-accent",
                      "transition-transform duration-fast ease-out",
                      selected ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
                    )}
                  />
                  <span className="w-2.5 shrink-0 text-micro text-ink-muted nums-tabular">
                    {index + 1}
                  </span>
                  <CoinMark src={asset.logoUrl} symbol={asset.symbol} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink">
                      {asset.name}
                    </span>
                    <span className="block text-micro uppercase text-ink-muted nums-tight">
                      {formatPrice(asset.price)}
                    </span>
                  </span>
                  <DeltaPill value={asset.change24h} size="sm" bare className="shrink-0" />
                  <span className="sr-only">
                    {selected ? " — shown in chart" : " — show in chart"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
