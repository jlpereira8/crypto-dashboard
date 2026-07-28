import { describe, expect, it } from "vitest";
import {
  getRange,
  normalizeAsset,
  normalizeGlobal,
  normalizeHistory,
  rangeStart,
} from "../lib/market-api";
import { RAW_GLOBAL, rawTicker } from "./fixtures";

describe("normalizeAsset", () => {
  it("maps the provider's nested quote onto a flat asset", () => {
    const asset = normalizeAsset(
      rawTicker({ id: "btc-bitcoin", name: "Bitcoin", symbol: "btc", rank: 1, price: 64_000 }),
      1,
    );

    expect(asset).toMatchObject({
      id: "btc-bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
      rank: 1,
      price: 64_000,
      logoUrl: "https://static.coinpaprika.com/coin/btc-bitcoin/logo.png",
    });
    expect(asset?.lastUpdated).toBe(Date.parse("2026-07-28T16:00:00Z"));
  });

  it("keeps missing numbers as null instead of coercing them to zero", () => {
    const asset = normalizeAsset(
      rawTicker({
        id: "ghost-coin",
        name: "Ghost",
        symbol: "GHO",
        rank: 9,
        price: null,
        market_cap: null,
        volume_24h: null,
        percent_change_24h: null,
      }),
      9,
    );

    expect(asset?.price).toBeNull();
    expect(asset?.marketCap).toBeNull();
    expect(asset?.volume24h).toBeNull();
    expect(asset?.change24h).toBeNull();
  });

  it("falls back to list position when the provider reports rank 0", () => {
    const asset = normalizeAsset(
      rawTicker({ id: "unranked", name: "Unranked", symbol: "UNR", rank: 0 }),
      42,
    );
    expect(asset?.rank).toBe(42);
  });

  it("returns null for an entry with no id, so it can be skipped", () => {
    expect(normalizeAsset({ name: "Nameless" }, 1)).toBeNull();
  });

  it("survives a non-numeric price string without producing NaN", () => {
    const asset = normalizeAsset(
      { id: "weird", name: "Weird", symbol: "WRD", rank: 1, quotes: { USD: { price: "n/a" } } },
      1,
    );
    expect(asset?.price).toBeNull();
  });
});

describe("normalizeGlobal", () => {
  it("maps the global payload", () => {
    expect(normalizeGlobal(RAW_GLOBAL)).toEqual({
      marketCap: 2_286_954_323_581,
      marketCapChange24h: -1.33,
      volume24h: 365_808_412_688,
      btcDominance: 55.99,
      assetCount: 12_530,
    });
  });

  it("nulls every field for an empty payload rather than zeroing them", () => {
    expect(normalizeGlobal({})).toEqual({
      marketCap: null,
      marketCapChange24h: null,
      volume24h: null,
      btcDominance: null,
      assetCount: null,
    });
  });
});

describe("normalizeHistory", () => {
  it("converts timestamps to epoch ms and drops unusable points", () => {
    const points = normalizeHistory([
      { timestamp: "2026-07-21T00:00:00Z", price: 100 },
      { timestamp: "not-a-date", price: 200 },
      { timestamp: "2026-07-22T00:00:00Z", price: null },
      { timestamp: "2026-07-23T00:00:00Z", price: 300 },
    ]);

    expect(points).toEqual([
      { x: Date.parse("2026-07-21T00:00:00Z"), y: 100 },
      { x: Date.parse("2026-07-23T00:00:00Z"), y: 300 },
    ]);
  });

  it("sorts ascending, since the chart's binary search depends on it", () => {
    const points = normalizeHistory([
      { timestamp: "2026-07-23T00:00:00Z", price: 300 },
      { timestamp: "2026-07-21T00:00:00Z", price: 100 },
    ]);
    expect(points.map((p) => p.y)).toEqual([100, 300]);
  });
});

describe("rangeStart", () => {
  const NOW = Date.parse("2026-07-28T16:00:00Z");

  it("uses a full ISO timestamp for hourly ranges", () => {
    expect(rangeStart(getRange("24H"), NOW)).toBe("2026-07-27T17:00:00Z");
  });

  it("uses a plain date for daily ranges", () => {
    expect(rangeStart(getRange("7D"), NOW)).toBe("2026-07-21");
  });

  it("clamps inside the free tier's windows (24h hourly, 365d daily)", () => {
    // The provider rejects hourly data older than ~24h and daily older than
    // ~365d, so the lookbacks are deliberately short of the round numbers.
    expect(getRange("24H").hours).toBeLessThan(24);
    expect(getRange("1Y").hours).toBeLessThan(24 * 365);
  });
});
