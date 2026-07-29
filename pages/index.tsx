import { useCallback, useMemo, useState } from "react";
import { DEFAULT_ASSET_ID, DEFAULT_RANGE, type RangeId } from "../lib/market-api";
import { findAsset, useAssetHistory, useGlobalMarket, useTopAssets } from "../lib/useMarketData";
import { usePortfolioValuation } from "../lib/usePortfolio";
import { ChartWorkspace } from "../components/dashboard/ChartWorkspace";
import { ExchangeCard } from "../components/dashboard/ExchangeCard";
import { MarketExplorer } from "../components/dashboard/MarketExplorer";
import { MarketBreadth } from "../components/dashboard/MarketBreadth";
import { MarketTicker } from "../components/dashboard/MarketTicker";
import { PortfolioCard } from "../components/dashboard/PortfolioCard";
import { TopGainersCard } from "../components/dashboard/TopGainersCard";
import { Watchlist } from "../components/dashboard/Watchlist";

/** Anchor target for the Portfolio card's "Swap assets" link. */
const SWAP_ANCHOR_ID = "swap";

/**
 * The market workspace.
 *
 * Two columns, each carrying a stack — not a page-wide vertical run of panels:
 *
 *     ┌──────────────────────────────┬───────────────┐
 *     │ chart (the hero)             │ portfolio     │
 *     │                              │ top gainers   │
 *     ├──────────────────────────────┤ swap          │
 *     │ market explorer (6-row peek) │               │
 *     └──────────────────────────────┴───────────────┘
 *
 * The previous revision let the market table run to ten rows plus pagination and
 * stacked the demo tools beneath it, so the page ran to ~1,270px and the table
 * dominated. Trimming the table to a six-row preview and moving the wallet into a
 * parallel column brings both stacks to roughly the same height, which is what
 * makes the layout read as balanced rather than as a scroll.
 *
 * The chart is still the only element at display size, and the explorer sits
 * directly beneath it so selecting a row changes a chart that is still in view.
 *
 * Data flow is unchanged: three requests, all derivation client-side. The
 * portfolio and top-gainers panels add none — the first is fixtures, the second is
 * derived from the market response the table already holds.
 */
export default function OverviewPage() {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_ASSET_ID);
  // Range is page-level state, so it survives switching assets.
  const [range, setRange] = useState<RangeId>(DEFAULT_RANGE);

  const topAssets = useTopAssets();
  const globalMarket = useGlobalMarket();
  // Values the sample holdings against the same top-50 response — no extra request.
  const portfolio = usePortfolioValuation();

  /**
   * Bitcoin is the default, but if the provider ever drops it from the top 50 we
   * fall back to whatever is ranked first rather than requesting a missing id.
   */
  const effectiveId = useMemo(() => {
    if (!topAssets.assets?.length) return selectedId;
    return topAssets.assets.some((asset) => asset.id === selectedId)
      ? selectedId
      : topAssets.assets[0].id;
  }, [topAssets.assets, selectedId]);

  const history = useAssetHistory(effectiveId, range);
  const selectedAsset = findAsset(topAssets.assets, effectiveId);

  const refreshAll = useCallback(() => {
    void topAssets.refetch();
    void globalMarket.refetch();
    void history.refetch();
  }, [globalMarket, history, topAssets]);

  const assetLoading = history.isLoading || (topAssets.isLoading && !selectedAsset);

  return (
    <div>
      <MarketTicker
        global={globalMarket.global}
        isLoading={globalMarket.isLoading}
        isRefreshing={globalMarket.isRefreshing || topAssets.isRefreshing}
        isError={globalMarket.isError}
        onRefresh={refreshAll}
      />

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ── Market column: the hero, then the market ────────────────────
               A flex column, so the leftover height of the grid row goes to the
               panel row at the bottom instead of pooling as empty surface below
               it. Chart and explorer keep their natural heights. */}
        <div className="flex min-w-0 flex-col xl:border-r xl:border-line">
          <ChartWorkspace
            asset={selectedAsset}
            points={history.points}
            range={range}
            onRangeChange={setRange}
            isLoading={assetLoading}
            isRefreshing={history.isRefreshing}
            isError={history.isError}
            onRetry={() => void history.refetch()}
          />

          <div className="border-t border-line">
            <MarketExplorer
              assets={topAssets.assets}
              selectedId={effectiveId}
              onSelect={setSelectedId}
              isLoading={topAssets.isLoading}
              isRefreshing={topAssets.isRefreshing}
              isError={topAssets.isError}
              onRetry={() => void topAssets.refetch()}
            />
          </div>

          {/* Two more workspace regions, not panels: they take the same flush,
              hairline-bounded treatment as the chart and the table above them.
              `flex-1` hands them the height this column would otherwise leave
              empty beside the taller wallet rail. Both derive from the market
              data already loaded, so neither costs a request. */}
          <div className="grid flex-1 divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <MarketBreadth assets={topAssets.assets} isLoading={topAssets.isLoading} />
            <Watchlist
              assets={topAssets.assets}
              selectedId={effectiveId}
              onSelect={setSelectedId}
              isLoading={topAssets.isLoading}
            />
          </div>
        </div>

        {/* ── Wallet column. Sits on the recessed canvas so its panels read as
               objects placed on the workspace rather than as more of it. ─── */}
        <div className="space-y-3 border-t border-line bg-canvas p-3 xl:border-t-0">
          <PortfolioCard
            valuation={portfolio.valuation}
            isLoading={portfolio.isLoading}
            swapHref={`#${SWAP_ANCHOR_ID}`}
            detailHref="/portfolio"
          />
          <TopGainersCard
            assets={topAssets.assets}
            selectedId={effectiveId}
            onSelect={setSelectedId}
            isLoading={topAssets.isLoading}
          />
          <ExchangeCard
            id={SWAP_ANCHOR_ID}
            assets={topAssets.assets}
            loading={topAssets.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
