/**
 * Sample portfolio.
 *
 * These are fixtures, not a wallet integration — there is no chain connection in
 * this app and nothing here is derived from the live API. They were always
 * fixtures (v1 hardcoded two of them straight into JSX); the set is now five
 * assets so that an allocation chart has something to actually say, and every
 * surface that renders them is labelled "Sample".
 *
 * Deliberately *not* multiplied by live prices: doing so would produce a
 * plausible-looking balance that moves with the market, which is exactly the
 * kind of invented financial figure worth avoiding. The unit counts and USD
 * values are fixed and internally consistent.
 */

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  units: number;
  usdValue: number;
}

export const SAMPLE_HOLDINGS: readonly Holding[] = [
  { id: "btc-bitcoin", symbol: "BTC", name: "Bitcoin", units: 0.142, usdValue: 9_204 },
  { id: "eth-ethereum", symbol: "ETH", name: "Ethereum", units: 1.75, usdValue: 5_950 },
  { id: "sol-solana", symbol: "SOL", name: "Solana", units: 27.4, usdValue: 4_055 },
  { id: "bnb-binance-coin", symbol: "BNB", name: "BNB", units: 3.1, usdValue: 1_860 },
  { id: "xrp-xrp", symbol: "XRP", name: "XRP", units: 1_240, usdValue: 778 },
];

/**
 * How many segments the donut draws before folding the tail into "Other".
 * Three is the count whose colours clear every all-pairs colour-vision gate on
 * both card surfaces; past that the palette's fourth slot collides with its
 * second under simulated deuteranopia.
 */
const DONUT_SLOTS = 3;

export const OTHER_SLICE_ID = "__other__";

export interface AllocationSlice {
  id: string;
  label: string;
  /** Share of the portfolio, 0–100. */
  share: number;
  usdValue: number;
  /** CSS custom property holding this slice's colour. */
  colorVar: string;
}

export interface PortfolioSummary {
  total: number;
  /** Every holding, largest first, each with its share and swatch colour. */
  holdings: (Holding & { share: number; colorVar: string })[];
  /** Donut segments: the top few by value, then a folded "Other". */
  slices: AllocationSlice[];
}

const SLICE_COLOR_VARS = ["--color-series-1", "--color-series-2", "--color-series-3"] as const;
const OTHER_COLOR_VAR = "--color-series-other";

/**
 * Totals, shares, and the donut's segments.
 *
 * Shares are computed against the true total, so the folded "Other" segment is
 * the exact remainder rather than a rounded-up leftover — the ring always closes.
 */
export function derivePortfolio(
  holdings: readonly Holding[] = SAMPLE_HOLDINGS,
): PortfolioSummary {
  const total = holdings.reduce((sum, holding) => sum + holding.usdValue, 0);
  const ranked = [...holdings].sort((a, b) => b.usdValue - a.usdValue);

  const shareOf = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  const withShares = ranked.map((holding, index) => ({
    ...holding,
    share: shareOf(holding.usdValue),
    // Holdings past the donut's slots take the "Other" swatch, so a row's dot
    // always matches the segment that represents it.
    colorVar: index < DONUT_SLOTS ? SLICE_COLOR_VARS[index] : OTHER_COLOR_VAR,
  }));

  const slices: AllocationSlice[] = ranked.slice(0, DONUT_SLOTS).map((holding, index) => ({
    id: holding.id,
    label: holding.name,
    share: shareOf(holding.usdValue),
    usdValue: holding.usdValue,
    colorVar: SLICE_COLOR_VARS[index],
  }));

  const tail = ranked.slice(DONUT_SLOTS);
  if (tail.length > 0) {
    const tailValue = tail.reduce((sum, holding) => sum + holding.usdValue, 0);
    slices.push({
      id: OTHER_SLICE_ID,
      label: tail.length === 1 ? tail[0].name : `${tail.length} others`,
      share: shareOf(tailValue),
      usdValue: tailValue,
      colorVar: OTHER_COLOR_VAR,
    });
  }

  return { total, holdings: withShares, slices };
}
