import { describe, expect, it } from "vitest";
import {
  OTHER_SLICE_ID,
  SAMPLE_HOLDINGS,
  SAMPLE_TRANSACTIONS,
  holdingsFromTransactions,
  valuePortfolio,
  type Holding,
  type Transaction,
} from "../lib/portfolio";
import { topMovers } from "../lib/market-view";
import type { Asset } from "../lib/market-api";
import { ASSETS, makeAsset } from "./fixtures";

const tx = (over: Partial<Transaction> & Pick<Transaction, "id" | "kind" | "units" | "unitPriceUsd">): Transaction => ({
  assetId: "a-asset",
  symbol: "A",
  name: "Asset A",
  timestamp: 1_000,
  ...over,
});

const holding = (over: Partial<Holding> & Pick<Holding, "id" | "units" | "costBasisUsd">): Holding => ({
  symbol: over.id.toUpperCase(),
  name: over.id,
  ...over,
});

const priceMap = (entries: [string, number | null][]): Map<string, Asset> => {
  const map = new Map<string, Asset>();
  for (const [id, price] of entries) {
    map.set(id, makeAsset({ id, symbol: id.toUpperCase(), name: id, rank: 1, price, change24h: 0 }));
  }
  return map;
};

describe("holdingsFromTransactions", () => {
  it("sums buys into units and cost basis", () => {
    const holdings = holdingsFromTransactions([
      tx({ id: "1", kind: "buy", units: 2, unitPriceUsd: 100 }),
      tx({ id: "2", kind: "buy", units: 3, unitPriceUsd: 200 }),
    ]);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].units).toBe(5);
    expect(holdings[0].costBasisUsd).toBe(800);
  });

  it("releases cost basis at average cost on a sell, not at the sale price", () => {
    // Buy 2 @ 100 and 2 @ 300 → 4 units, basis 800, average 200.
    // Selling 2 at any price should release exactly 400 of basis.
    const holdings = holdingsFromTransactions([
      tx({ id: "1", kind: "buy", units: 2, unitPriceUsd: 100 }),
      tx({ id: "2", kind: "buy", units: 2, unitPriceUsd: 300 }),
      tx({ id: "3", kind: "sell", units: 2, unitPriceUsd: 999, timestamp: 2_000 }),
    ]);
    expect(holdings[0].units).toBe(2);
    expect(holdings[0].costBasisUsd).toBeCloseTo(400);
  });

  it("drops an asset that has been fully sold", () => {
    const holdings = holdingsFromTransactions([
      tx({ id: "1", kind: "buy", units: 1, unitPriceUsd: 100 }),
      tx({ id: "2", kind: "sell", units: 1, unitPriceUsd: 150, timestamp: 2_000 }),
    ]);
    expect(holdings).toEqual([]);
  });

  it("never lets a sell drive units negative", () => {
    const holdings = holdingsFromTransactions([
      tx({ id: "1", kind: "buy", units: 1, unitPriceUsd: 100 }),
      tx({ id: "2", kind: "sell", units: 5, unitPriceUsd: 150, timestamp: 2_000 }),
    ]);
    expect(holdings).toEqual([]);
  });

  it("processes oldest first regardless of input order", () => {
    const late = tx({ id: "late", kind: "sell", units: 1, unitPriceUsd: 500, timestamp: 9_000 });
    const early = tx({ id: "early", kind: "buy", units: 3, unitPriceUsd: 100, timestamp: 1_000 });
    expect(holdingsFromTransactions([late, early])[0].units).toBe(2);
  });

  it("keeps separate assets separate", () => {
    const holdings = holdingsFromTransactions([
      tx({ id: "1", kind: "buy", units: 1, unitPriceUsd: 100 }),
      tx({ id: "2", kind: "buy", units: 5, unitPriceUsd: 10, assetId: "b-asset", symbol: "B", name: "Asset B" }),
    ]);
    expect(holdings.map((h) => h.id).sort()).toEqual(["a-asset", "b-asset"]);
  });

  it("does not mutate the input", () => {
    const input = [tx({ id: "1", kind: "buy", units: 1, unitPriceUsd: 100 })];
    const snapshot = JSON.stringify(input);
    holdingsFromTransactions(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("derives the shipped sample holdings from the shipped transactions", () => {
    // The two fixtures must agree by construction, not by coincidence.
    expect(SAMPLE_HOLDINGS).toEqual(holdingsFromTransactions(SAMPLE_TRANSACTIONS));
    expect(SAMPLE_HOLDINGS.length).toBeGreaterThan(0);
    for (const h of SAMPLE_HOLDINGS) {
      expect(h.units).toBeGreaterThan(0);
      expect(h.costBasisUsd).toBeGreaterThan(0);
    }
  });
});

describe("valuePortfolio", () => {
  const holdings = [
    holding({ id: "a", units: 2, costBasisUsd: 100 }),
    holding({ id: "b", units: 1, costBasisUsd: 100 }),
  ];

  it("values holdings at live prices", () => {
    const result = valuePortfolio(holdings, priceMap([["a", 100], ["b", 50]]));
    expect(result.totalValueUsd).toBe(250);
    expect(result.totalCostUsd).toBe(200);
  });

  it("computes unrealised return per holding and overall", () => {
    const result = valuePortfolio(holdings, priceMap([["a", 100], ["b", 50]]));
    expect(result.totalPnlUsd).toBe(50);
    expect(result.totalPnlPct).toBeCloseTo(25);
    const a = result.holdings.find((h) => h.id === "a");
    expect(a?.pnlUsd).toBe(100);
    expect(a?.pnlPct).toBeCloseTo(100);
  });

  it("orders holdings by value and assigns the top three their own colour", () => {
    const many = ["a", "b", "c", "d"].map((id, index) =>
      holding({ id, units: 1, costBasisUsd: 10 * (index + 1) }),
    );
    const result = valuePortfolio(
      many,
      priceMap([["a", 10], ["b", 40], ["c", 30], ["d", 20]]),
    );
    expect(result.holdings.map((h) => h.id)).toEqual(["b", "c", "d", "a"]);
    expect(result.holdings.slice(0, 3).map((h) => h.colorVar)).toEqual([
      "--color-series-1",
      "--color-series-2",
      "--color-series-3",
    ]);
    expect(result.holdings[3].colorVar).toBe("--color-series-other");
  });

  it("folds everything past the third holding into one Other segment", () => {
    const many = ["a", "b", "c", "d", "e"].map((id) => holding({ id, units: 1, costBasisUsd: 1 }));
    const result = valuePortfolio(
      many,
      priceMap([["a", 50], ["b", 25], ["c", 15], ["d", 6], ["e", 4]]),
    );
    expect(result.slices).toHaveLength(4);
    expect(result.slices[3].id).toBe(OTHER_SLICE_ID);
    expect(result.slices[3].label).toBe("2 others");
    expect(result.slices[3].valueUsd).toBe(10);
  });

  it("closes the ring — segment shares sum to 100", () => {
    const result = valuePortfolio(SAMPLE_HOLDINGS, priceMap([
      ["btc-bitcoin", 64_000],
      ["eth-ethereum", 3_400],
      ["sol-solana", 148],
      ["bnb-binance-coin", 600],
      ["xrp-xrp", 0.62],
    ]));
    const sum = result.slices.reduce((total, slice) => total + slice.share, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it("measures today's move against the previous price, not the current one", () => {
    // 110 now after +10% means 100 yesterday, so the move is 10 — not 11.
    const result = valuePortfolio(
      [holding({ id: "a", units: 1, costBasisUsd: 50 })],
      new Map([
        [
          "a",
          makeAsset({ id: "a", symbol: "A", name: "A", rank: 1, price: 110, change24h: 10 }),
        ],
      ]),
    );
    expect(result.todayPnlUsd).toBeCloseTo(10);
    expect(result.todayPnlPct).toBeCloseTo(10);
  });

  it("treats a missing price as unknown rather than worthless", () => {
    const result = valuePortfolio(holdings, priceMap([["a", 100], ["b", null]]));
    expect(result.hasMissingPrices).toBe(true);
    const b = result.holdings.find((h) => h.id === "b");
    expect(b?.valueUsd).toBeNull();
    expect(b?.pnlUsd).toBeNull();
    // The priced holding still contributes.
    expect(result.totalValueUsd).toBe(200);
  });

  it("returns a null total when nothing can be priced", () => {
    const result = valuePortfolio(holdings, new Map());
    expect(result.totalValueUsd).toBeNull();
    expect(result.totalPnlUsd).toBeNull();
    expect(result.todayPnlUsd).toBeNull();
  });

  it("identifies the best and worst 24h movers", () => {
    const assets = new Map<string, Asset>([
      ["a", makeAsset({ id: "a", symbol: "A", name: "A", rank: 1, price: 10, change24h: 5 })],
      ["b", makeAsset({ id: "b", symbol: "B", name: "B", rank: 2, price: 10, change24h: -3 })],
    ]);
    const result = valuePortfolio(holdings, assets);
    expect(result.best?.id).toBe("a");
    expect(result.worst?.id).toBe("b");
  });

  it("reports no worst mover when only one holding has change data", () => {
    const result = valuePortfolio(
      [holding({ id: "a", units: 1, costBasisUsd: 1 })],
      priceMap([["a", 10]]),
    );
    expect(result.best?.id).toBe("a");
    expect(result.worst).toBeNull();
  });

  it("handles an empty portfolio without dividing by zero", () => {
    const result = valuePortfolio([], new Map());
    expect(result.totalValueUsd).toBeNull();
    expect(result.totalCostUsd).toBe(0);
    expect(result.holdings).toEqual([]);
    expect(result.slices).toEqual([]);
    expect(result.best).toBeNull();
  });
});

describe("topMovers", () => {
  it("returns the strongest gainers, largest first", () => {
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
});
