import { describe, expect, it } from "vitest";
import {
  DEFAULT_SORT,
  deriveMarketView,
  seriesChangePct,
  seriesExtent,
  type MarketSort,
} from "../lib/market-view";
import { ASSETS, makeAsset } from "./fixtures";

const base = { assets: ASSETS, search: "", filter: "all" as const, sort: DEFAULT_SORT, page: 0 };

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe("sorting", () => {
  it("defaults to ascending rank", () => {
    expect(ids(deriveMarketView(base).rows)).toEqual([
      "btc-bitcoin",
      "eth-ethereum",
      "xrp-xrp",
      "sol-solana",
      "ada-cardano",
    ]);
  });

  it("sorts by price descending", () => {
    const sort: MarketSort = { key: "price", direction: "desc" };
    expect(ids(deriveMarketView({ ...base, sort }).rows)[0]).toBe("btc-bitcoin");
    expect(ids(deriveMarketView({ ...base, sort }).rows).at(-1)).toBe("ada-cardano");
  });

  it("sorts by 24h change ascending, putting the worst performer first", () => {
    const sort: MarketSort = { key: "change24h", direction: "asc" };
    expect(ids(deriveMarketView({ ...base, sort }).rows)[0]).toBe("sol-solana");
  });

  it("sorts by volume descending", () => {
    const sort: MarketSort = { key: "volume24h", direction: "desc" };
    expect(ids(deriveMarketView({ ...base, sort }).rows)[0]).toBe("sol-solana");
  });

  it("orders assets with a missing value last, not as if they were zero", () => {
    const assets = [...ASSETS, makeAsset({ id: "null-coin", symbol: "NUL", name: "Nullish", rank: 6, price: null })];
    const sort: MarketSort = { key: "price", direction: "desc" };
    expect(ids(deriveMarketView({ ...base, assets, sort }).rows).at(-1)).toBe("null-coin");
  });

  it("breaks ties on rank so equal values never reorder between renders", () => {
    const assets = [
      makeAsset({ id: "b-coin", symbol: "B", name: "B", rank: 2, price: 10 }),
      makeAsset({ id: "a-coin", symbol: "A", name: "A", rank: 1, price: 10 }),
    ];
    const sort: MarketSort = { key: "price", direction: "desc" };
    expect(ids(deriveMarketView({ ...base, assets, sort }).rows)).toEqual(["a-coin", "b-coin"]);
  });
});

describe("search", () => {
  it("matches on name, case-insensitively", () => {
    expect(ids(deriveMarketView({ ...base, search: "bitc" }).rows)).toEqual(["btc-bitcoin"]);
  });

  it("matches on symbol", () => {
    expect(ids(deriveMarketView({ ...base, search: "eth" }).rows)).toEqual(["eth-ethereum"]);
  });

  it("ignores surrounding whitespace", () => {
    expect(ids(deriveMarketView({ ...base, search: "  SOL  " }).rows)).toEqual(["sol-solana"]);
  });

  it("reports zero results for a term that matches nothing", () => {
    const view = deriveMarketView({ ...base, search: "dogecoin" });
    expect(view.rows).toHaveLength(0);
    expect(view.total).toBe(0);
  });
});

describe("filters", () => {
  it("gainers keeps only positive 24h movers", () => {
    expect(ids(deriveMarketView({ ...base, filter: "gainers" }).rows)).toEqual([
      "btc-bitcoin",
      "xrp-xrp",
    ]);
  });

  it("losers keeps only negative 24h movers", () => {
    expect(ids(deriveMarketView({ ...base, filter: "losers" }).rows)).toEqual([
      "eth-ethereum",
      "sol-solana",
    ]);
  });

  it("excludes a flat asset from both gainers and losers", () => {
    expect(ids(deriveMarketView({ ...base, filter: "gainers" }).rows)).not.toContain("ada-cardano");
    expect(ids(deriveMarketView({ ...base, filter: "losers" }).rows)).not.toContain("ada-cardano");
  });

  it("highest volume keeps every asset but reorders by volume", () => {
    const view = deriveMarketView({ ...base, filter: "volume" });
    expect(view.total).toBe(ASSETS.length);
    expect(ids(view.rows)[0]).toBe("sol-solana");
  });

  it("lets an explicit column sort win over the volume tab's default order", () => {
    const sort: MarketSort = { key: "price", direction: "desc" };
    expect(ids(deriveMarketView({ ...base, filter: "volume", sort }).rows)[0]).toBe("btc-bitcoin");
  });

  it("applies search and filter together", () => {
    // "eth" matches only Ethereum, which is also a loser.
    expect(ids(deriveMarketView({ ...base, search: "eth", filter: "losers" }).rows)).toEqual([
      "eth-ethereum",
    ]);
    // Bitcoin matches the search but is a gainer, so the filter excludes it.
    expect(deriveMarketView({ ...base, search: "btc", filter: "losers" }).rows).toHaveLength(0);
  });
});

describe("pagination", () => {
  const many = Array.from({ length: 23 }, (_, index) =>
    makeAsset({
      id: `coin-${index}`,
      symbol: `C${index}`,
      name: `Coin ${index}`,
      rank: index + 1,
    }),
  );

  it("returns pageSize rows and the right page count", () => {
    const view = deriveMarketView({ ...base, assets: many, pageSize: 10 });
    expect(view.rows).toHaveLength(10);
    expect(view.pageCount).toBe(3);
    expect(view.total).toBe(23);
  });

  it("returns the remainder on the last page", () => {
    const view = deriveMarketView({ ...base, assets: many, page: 2, pageSize: 10 });
    expect(view.rows).toHaveLength(3);
    expect(ids(view.rows)[0]).toBe("coin-20");
  });

  it("clamps an out-of-range page instead of rendering nothing", () => {
    const view = deriveMarketView({ ...base, assets: many, page: 99, pageSize: 10 });
    expect(view.page).toBe(2);
    expect(view.rows).toHaveLength(3);
  });

  it("clamps a negative page to the first page", () => {
    expect(deriveMarketView({ ...base, assets: many, page: -5, pageSize: 10 }).page).toBe(0);
  });

  it("reports one page when a search empties the list, not zero", () => {
    const view = deriveMarketView({ ...base, assets: many, search: "nothing", pageSize: 10 });
    expect(view.pageCount).toBe(1);
    expect(view.total).toBe(0);
  });
});

describe("series helpers", () => {
  it("computes percentage change across the visible series", () => {
    expect(seriesChangePct([{ y: 100 }, { y: 150 }])).toBeCloseTo(50);
    expect(seriesChangePct([{ y: 200 }, { y: 150 }])).toBeCloseTo(-25);
  });

  it("returns null when there is nothing to compare", () => {
    expect(seriesChangePct([])).toBeNull();
    expect(seriesChangePct([{ y: 100 }])).toBeNull();
  });

  it("returns null rather than Infinity when the series starts at zero", () => {
    expect(seriesChangePct([{ y: 0 }, { y: 100 }])).toBeNull();
  });

  it("finds the low and high", () => {
    expect(seriesExtent([{ y: 5 }, { y: 1 }, { y: 9 }])).toEqual({ low: 1, high: 9 });
    expect(seriesExtent([])).toEqual({ low: null, high: null });
  });
});
