import { describe, expect, it } from "vitest";
import { OTHER_SLICE_ID, SAMPLE_HOLDINGS, derivePortfolio, type Holding } from "../lib/portfolio";
import { topMovers } from "../lib/market-view";
import { ASSETS, makeAsset } from "./fixtures";

const holding = (id: string, usdValue: number): Holding => ({
  id,
  symbol: id.toUpperCase(),
  name: id,
  units: 1,
  usdValue,
});

describe("derivePortfolio", () => {
  it("totals the holdings", () => {
    const { total } = derivePortfolio([holding("a", 100), holding("b", 300)]);
    expect(total).toBe(400);
  });

  it("computes each holding's share and orders largest first", () => {
    const { holdings } = derivePortfolio([
      holding("small", 250),
      holding("big", 750),
    ]);
    expect(holdings.map((h) => h.id)).toEqual(["big", "small"]);
    expect(holdings[0].share).toBeCloseTo(75);
    expect(holdings[1].share).toBeCloseTo(25);
  });

  it("gives each of the top three its own colour slot", () => {
    const { slices } = derivePortfolio([
      holding("a", 400),
      holding("b", 300),
      holding("c", 200),
    ]);
    expect(slices.map((s) => s.colorVar)).toEqual([
      "--color-series-1",
      "--color-series-2",
      "--color-series-3",
    ]);
  });

  it("folds everything past the third holding into one Other segment", () => {
    const { slices } = derivePortfolio([
      holding("a", 400),
      holding("b", 300),
      holding("c", 200),
      holding("d", 60),
      holding("e", 40),
    ]);

    expect(slices).toHaveLength(4);
    const other = slices[3];
    expect(other.id).toBe(OTHER_SLICE_ID);
    expect(other.label).toBe("2 others");
    expect(other.usdValue).toBe(100);
    expect(other.share).toBeCloseTo(10);
  });

  it("names the Other segment after the asset when only one is folded", () => {
    const { slices } = derivePortfolio([
      holding("a", 400),
      holding("b", 300),
      holding("c", 200),
      { ...holding("d", 100), name: "Solana" },
    ]);
    expect(slices[3].label).toBe("Solana");
  });

  it("omits the Other segment when nothing is left over", () => {
    const { slices } = derivePortfolio([holding("a", 100), holding("b", 50)]);
    expect(slices).toHaveLength(2);
    expect(slices.some((s) => s.id === OTHER_SLICE_ID)).toBe(false);
  });

  it("closes the ring — segment shares always sum to 100", () => {
    const { slices } = derivePortfolio(SAMPLE_HOLDINGS);
    const sum = slices.reduce((total, slice) => total + slice.share, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it("gives folded holdings the same swatch as the Other segment", () => {
    const { holdings } = derivePortfolio(SAMPLE_HOLDINGS);
    expect(holdings[3].colorVar).toBe("--color-series-other");
    expect(holdings[4].colorVar).toBe("--color-series-other");
  });

  it("survives an empty portfolio without dividing by zero", () => {
    const { total, holdings, slices } = derivePortfolio([]);
    expect(total).toBe(0);
    expect(holdings).toEqual([]);
    expect(slices).toEqual([]);
  });

  it("does not mutate the input", () => {
    const input = [holding("a", 1), holding("b", 2)];
    const snapshot = JSON.stringify(input);
    derivePortfolio(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("topMovers", () => {
  it("returns the strongest gainers, largest first", () => {
    // Fixtures: BTC +2.5, XRP +0.4, ETH -1.25, SOL -3.75, ADA 0.
    expect(topMovers(ASSETS, "gainers").map((a) => a.symbol)).toEqual(["BTC", "XRP"]);
  });

  it("returns the worst losers, largest drop first", () => {
    expect(topMovers(ASSETS, "losers").map((a) => a.symbol)).toEqual(["SOL", "ETH"]);
  });

  it("caps the result at the requested count", () => {
    expect(topMovers(ASSETS, "gainers", 1).map((a) => a.symbol)).toEqual(["BTC"]);
  });

  it("excludes flat assets from both directions", () => {
    expect(topMovers(ASSETS, "gainers").map((a) => a.symbol)).not.toContain("ADA");
    expect(topMovers(ASSETS, "losers").map((a) => a.symbol)).not.toContain("ADA");
  });

  it("excludes a missing change rather than treating it as 0%", () => {
    const assets = [
      ...ASSETS,
      makeAsset({ id: "n", symbol: "NUL", name: "Nullish", rank: 9, change24h: null }),
    ];
    expect(topMovers(assets, "gainers").map((a) => a.symbol)).not.toContain("NUL");
    expect(topMovers(assets, "losers").map((a) => a.symbol)).not.toContain("NUL");
  });

  it("returns an empty list when there is no data at all", () => {
    expect(topMovers(undefined, "gainers")).toEqual([]);
  });

  it("does not mutate the input array's order", () => {
    const order = ASSETS.map((a) => a.id);
    topMovers(ASSETS, "losers");
    expect(ASSETS.map((a) => a.id)).toEqual(order);
  });
});
