import type { Asset } from "./market-api";

/**
 * Sample portfolio.
 *
 * There is no wallet connection in this app, so the holdings are fixtures. Two
 * choices keep that honest:
 *
 * 1. **Transactions are the source of truth and holdings are derived from them.**
 *    Nothing is a free-floating invented balance — every unit traces to a trade,
 *    and the two views reconcile by construction rather than by luck.
 * 2. **Only units and cost basis are fixed.** Current value, P/L and today's move
 *    are computed from live prices, so every figure the UI shows is a real
 *    calculation over a labelled premise, not a number someone typed in.
 */

export interface Transaction {
  id: string;
  kind: "buy" | "sell";
  assetId: string;
  symbol: string;
  name: string;
  units: number;
  /** Unit price paid or received, USD. */
  unitPriceUsd: number;
  /** Epoch ms. Fixed values, so nothing here drifts with the clock. */
  timestamp: number;
}

const DAY = 86_400_000;
/** Anchor for the fixture timeline: 2026-01-05T09:00:00Z. */
const T0 = Date.parse("2026-01-05T09:00:00Z");

export const SAMPLE_TRANSACTIONS: readonly Transaction[] = [
  { id: "t1", kind: "buy", assetId: "btc-bitcoin", symbol: "BTC", name: "Bitcoin", units: 0.09, unitPriceUsd: 58_400, timestamp: T0 },
  { id: "t2", kind: "buy", assetId: "eth-ethereum", symbol: "ETH", name: "Ethereum", units: 1.25, unitPriceUsd: 2_980, timestamp: T0 + 6 * DAY },
  { id: "t3", kind: "buy", assetId: "sol-solana", symbol: "SOL", name: "Solana", units: 18, unitPriceUsd: 121.5, timestamp: T0 + 19 * DAY },
  { id: "t4", kind: "buy", assetId: "btc-bitcoin", symbol: "BTC", name: "Bitcoin", units: 0.062, unitPriceUsd: 63_100, timestamp: T0 + 34 * DAY },
  { id: "t5", kind: "buy", assetId: "bnb-binance-coin", symbol: "BNB", name: "BNB", units: 4.4, unitPriceUsd: 548, timestamp: T0 + 47 * DAY },
  { id: "t6", kind: "buy", assetId: "eth-ethereum", symbol: "ETH", name: "Ethereum", units: 0.5, unitPriceUsd: 3_240, timestamp: T0 + 61 * DAY },
  { id: "t7", kind: "sell", assetId: "bnb-binance-coin", symbol: "BNB", name: "BNB", units: 1.3, unitPriceUsd: 602, timestamp: T0 + 76 * DAY },
  { id: "t8", kind: "buy", assetId: "xrp-xrp", symbol: "XRP", name: "XRP", units: 1_240, unitPriceUsd: 0.58, timestamp: T0 + 88 * DAY },
  { id: "t9", kind: "buy", assetId: "sol-solana", symbol: "SOL", name: "Solana", units: 9.4, unitPriceUsd: 143.2, timestamp: T0 + 103 * DAY },
  { id: "t10", kind: "sell", assetId: "btc-bitcoin", symbol: "BTC", name: "Bitcoin", units: 0.01, unitPriceUsd: 66_800, timestamp: T0 + 119 * DAY },
];

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  /** Net units held. */
  units: number;
  /** Total still invested, USD, after sells are credited back at cost. */
  costBasisUsd: number;
}

/**
 * Folds a transaction list into net holdings.
 *
 * Sells reduce the cost basis proportionally to the units released (average-cost
 * method) rather than at the sale price, so the remaining basis stays the amount
 * actually still invested. Holdings that net to zero are dropped.
 */
export function holdingsFromTransactions(
  transactions: readonly Transaction[] = SAMPLE_TRANSACTIONS,
): Holding[] {
  const byAsset = new Map<string, Holding>();

  // Oldest first, so an average cost basis is well defined at each step.
  for (const tx of [...transactions].sort((a, b) => a.timestamp - b.timestamp)) {
    const existing =
      byAsset.get(tx.assetId) ??
      { id: tx.assetId, symbol: tx.symbol, name: tx.name, units: 0, costBasisUsd: 0 };

    if (tx.kind === "buy") {
      existing.units += tx.units;
      existing.costBasisUsd += tx.units * tx.unitPriceUsd;
    } else {
      const avgCost = existing.units > 0 ? existing.costBasisUsd / existing.units : 0;
      const sold = Math.min(tx.units, existing.units);
      existing.units -= sold;
      existing.costBasisUsd -= sold * avgCost;
    }

    byAsset.set(tx.assetId, existing);
  }

  return [...byAsset.values()].filter((holding) => holding.units > 1e-12);
}

export const SAMPLE_HOLDINGS: readonly Holding[] = holdingsFromTransactions();

/* ── Allocation colours ──────────────────────────────────────────────────── */

/**
 * How many segments the donut draws before folding the tail into "Other".
 * Three is the count whose colours clear every all-pairs colour-vision gate on
 * both card surfaces; the palette's fourth slot collides with its second under
 * simulated deuteranopia.
 */
const DONUT_SLOTS = 3;

export const OTHER_SLICE_ID = "__other__";

const SLICE_COLOR_VARS = ["--color-series-1", "--color-series-2", "--color-series-3"] as const;
const OTHER_COLOR_VAR = "--color-series-other";

export interface AllocationSlice {
  id: string;
  label: string;
  /** Share of the portfolio, 0–100. */
  share: number;
  valueUsd: number;
  colorVar: string;
}

/* ── Valuation ───────────────────────────────────────────────────────────── */

export interface ValuedHolding extends Holding {
  price: number | null;
  /** Units × live price. Null when the provider has no price for the asset. */
  valueUsd: number | null;
  share: number;
  /** Unrealised gain against cost basis. */
  pnlUsd: number | null;
  pnlPct: number | null;
  /** Value moved in the last 24h, from the asset's own 24h change. */
  todayUsd: number | null;
  change24hPct: number | null;
  colorVar: string;
}

export interface PortfolioValuation {
  totalValueUsd: number | null;
  totalCostUsd: number;
  totalPnlUsd: number | null;
  totalPnlPct: number | null;
  todayPnlUsd: number | null;
  todayPnlPct: number | null;
  holdings: ValuedHolding[];
  slices: AllocationSlice[];
  best: ValuedHolding | null;
  worst: ValuedHolding | null;
  /** True when at least one holding has no live price. */
  hasMissingPrices: boolean;
}

/**
 * Absolute value moved over the last 24h.
 *
 * A percentage change is measured against the *previous* price, so the move is
 * `value × c / (100 + c)`, not `value × c / 100`. The naive form overstates gains
 * and understates losses; at ±3% that is a ~3% error on the figure itself.
 */
function todayDelta(valueUsd: number, changePct: number): number | null {
  const denominator = 100 + changePct;
  if (denominator === 0) return null;
  return (valueUsd * changePct) / denominator;
}

/**
 * Values a portfolio against live market data.
 *
 * A holding with no live price contributes `null` rather than 0 — a missing price
 * is not a worthless asset — and sets `hasMissingPrices` so the UI can say the
 * total is partial instead of quietly under-reporting it.
 */
export function valuePortfolio(
  holdings: readonly Holding[],
  assetsById: Map<string, Asset>,
): PortfolioValuation {
  const priced = holdings.map((holding) => {
    const asset = assetsById.get(holding.id);
    const price = asset?.price ?? null;
    const valueUsd = price === null ? null : holding.units * price;
    const change24hPct = asset?.change24h ?? null;

    return {
      ...holding,
      price,
      valueUsd,
      change24hPct,
      pnlUsd: valueUsd === null ? null : valueUsd - holding.costBasisUsd,
      pnlPct:
        valueUsd === null || holding.costBasisUsd === 0
          ? null
          : ((valueUsd - holding.costBasisUsd) / holding.costBasisUsd) * 100,
      todayUsd:
        valueUsd === null || change24hPct === null ? null : todayDelta(valueUsd, change24hPct),
      // Filled in below, once shares are known.
      share: 0,
      colorVar: OTHER_COLOR_VAR,
    } satisfies ValuedHolding;
  });

  const hasMissingPrices = priced.some((holding) => holding.valueUsd === null);
  const anyPriced = priced.some((holding) => holding.valueUsd !== null);

  const totalValueUsd = anyPriced
    ? priced.reduce((sum, holding) => sum + (holding.valueUsd ?? 0), 0)
    : null;
  const totalCostUsd = holdings.reduce((sum, holding) => sum + holding.costBasisUsd, 0);

  const ranked = [...priced].sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));

  const withShares = ranked.map((holding, index) => ({
    ...holding,
    share:
      totalValueUsd && totalValueUsd > 0 && holding.valueUsd !== null
        ? (holding.valueUsd / totalValueUsd) * 100
        : 0,
    // Holdings past the ring's slots take the "Other" swatch, so a row's dot
    // always matches the segment representing it.
    colorVar: index < DONUT_SLOTS ? SLICE_COLOR_VARS[index] : OTHER_COLOR_VAR,
  }));

  const slices: AllocationSlice[] = withShares.slice(0, DONUT_SLOTS).map((holding) => ({
    id: holding.id,
    label: holding.name,
    share: holding.share,
    valueUsd: holding.valueUsd ?? 0,
    colorVar: holding.colorVar,
  }));

  const tail = withShares.slice(DONUT_SLOTS);
  if (tail.length > 0) {
    slices.push({
      id: OTHER_SLICE_ID,
      label: tail.length === 1 ? tail[0].name : `${tail.length} others`,
      share: tail.reduce((sum, holding) => sum + holding.share, 0),
      valueUsd: tail.reduce((sum, holding) => sum + (holding.valueUsd ?? 0), 0),
      colorVar: OTHER_COLOR_VAR,
    });
  }

  const movers = withShares.filter(
    (holding): holding is ValuedHolding & { change24hPct: number } =>
      typeof holding.change24hPct === "number",
  );
  const byChange = [...movers].sort((a, b) => b.change24hPct - a.change24hPct);

  const todayPnlUsd = movers.length
    ? movers.reduce((sum, holding) => sum + (holding.todayUsd ?? 0), 0)
    : null;

  // Yesterday's value is today's minus the move, which is the correct base for
  // a percentage.
  const previousValue =
    totalValueUsd !== null && todayPnlUsd !== null ? totalValueUsd - todayPnlUsd : null;

  return {
    totalValueUsd,
    totalCostUsd,
    totalPnlUsd: totalValueUsd === null ? null : totalValueUsd - totalCostUsd,
    totalPnlPct:
      totalValueUsd === null || totalCostUsd === 0
        ? null
        : ((totalValueUsd - totalCostUsd) / totalCostUsd) * 100,
    todayPnlUsd,
    todayPnlPct:
      todayPnlUsd === null || previousValue === null || previousValue <= 0
        ? null
        : (todayPnlUsd / previousValue) * 100,
    holdings: withShares,
    slices,
    best: byChange[0] ?? null,
    worst: byChange.length > 1 ? byChange[byChange.length - 1] : null,
    hasMissingPrices,
  };
}
