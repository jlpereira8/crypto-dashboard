import type { Asset } from "../lib/market-api";

/** Shape returned by CoinPaprika's /tickers, trimmed to the fields we read. */
export function rawTicker(overrides: {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  price?: number | null;
  market_cap?: number | null;
  volume_24h?: number | null;
  percent_change_24h?: number | null;
  last_updated?: string;
}) {
  const {
    id,
    name,
    symbol,
    rank,
    price = 100,
    market_cap = 1_000_000,
    volume_24h = 500_000,
    percent_change_24h = 1,
    last_updated = "2026-07-28T16:00:00Z",
  } = overrides;

  return {
    id,
    name,
    symbol,
    rank,
    last_updated,
    quotes: { USD: { price, market_cap, volume_24h, percent_change_24h } },
  };
}

export const RAW_TICKERS = [
  rawTicker({ id: "btc-bitcoin", name: "Bitcoin", symbol: "BTC", rank: 1, price: 64000, market_cap: 1_280_000_000_000, volume_24h: 21_000_000_000, percent_change_24h: 2.5 }),
  rawTicker({ id: "eth-ethereum", name: "Ethereum", symbol: "ETH", rank: 2, price: 3400, market_cap: 410_000_000_000, volume_24h: 14_000_000_000, percent_change_24h: -1.25 }),
  rawTicker({ id: "xrp-xrp", name: "XRP", symbol: "XRP", rank: 3, price: 0.62, market_cap: 35_000_000_000, volume_24h: 2_000_000_000, percent_change_24h: 0.4 }),
  rawTicker({ id: "sol-solana", name: "Solana", symbol: "SOL", rank: 4, price: 148, market_cap: 68_000_000_000, volume_24h: 30_000_000_000, percent_change_24h: -3.75 }),
];

export const RAW_GLOBAL = {
  market_cap_usd: 2_286_954_323_581,
  market_cap_change_24h: -1.33,
  volume_24h_usd: 365_808_412_688,
  bitcoin_dominance_percentage: 55.99,
  cryptocurrencies_number: 12_530,
};

export const RAW_HISTORY = [
  { timestamp: "2026-07-21T00:00:00Z", price: 66_092.81 },
  { timestamp: "2026-07-22T00:00:00Z", price: 65_400.1 },
  { timestamp: "2026-07-23T00:00:00Z", price: 64_980.55 },
  { timestamp: "2026-07-24T00:00:00Z", price: 65_720.4 },
  { timestamp: "2026-07-25T00:00:00Z", price: 64_100.22 },
];

/** Normalised assets, for the pure view/sorting tests. */
export function makeAsset(overrides: Partial<Asset> & Pick<Asset, "id" | "symbol" | "name" | "rank">): Asset {
  return {
    logoUrl: `https://static.coinpaprika.com/coin/${overrides.id}/logo.png`,
    price: 100,
    marketCap: 1_000_000,
    volume24h: 500_000,
    change24h: 1,
    lastUpdated: 1_769_616_000_000,
    ...overrides,
  };
}

export const ASSETS: Asset[] = [
  makeAsset({ id: "btc-bitcoin", symbol: "BTC", name: "Bitcoin", rank: 1, price: 64_000, marketCap: 1_280_000_000_000, volume24h: 21_000_000_000, change24h: 2.5 }),
  makeAsset({ id: "eth-ethereum", symbol: "ETH", name: "Ethereum", rank: 2, price: 3_400, marketCap: 410_000_000_000, volume24h: 14_000_000_000, change24h: -1.25 }),
  makeAsset({ id: "xrp-xrp", symbol: "XRP", name: "XRP", rank: 3, price: 0.62, marketCap: 35_000_000_000, volume24h: 2_000_000_000, change24h: 0.4 }),
  makeAsset({ id: "sol-solana", symbol: "SOL", name: "Solana", rank: 4, price: 148, marketCap: 68_000_000_000, volume24h: 30_000_000_000, change24h: -3.75 }),
  makeAsset({ id: "ada-cardano", symbol: "ADA", name: "Cardano", rank: 5, price: 0.38, marketCap: 13_000_000_000, volume24h: 400_000_000, change24h: 0 }),
];

/**
 * Installs a `fetch` stub that routes CoinPaprika paths to the fixtures above.
 * Returns the list of requested URLs so tests can assert the request count.
 */
export function stubFetch() {
  const calls: string[] = [];

  const impl = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);

    const body = url.includes("/global")
      ? RAW_GLOBAL
      : url.includes("/historical")
        ? RAW_HISTORY
        : url.includes("/tickers")
          ? RAW_TICKERS
          : null;

    if (body === null) {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  globalThis.fetch = impl as unknown as typeof fetch;
  return calls;
}
