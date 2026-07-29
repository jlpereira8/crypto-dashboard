import type { CodeSample } from "../components/ui";

/**
 * API reference content.
 *
 * This documents the *real* integration this app uses — CoinPaprika's public API,
 * called directly from the browser. There is no CryptoBay backend, and inventing
 * one with fake keys and endpoints would be documentation for software that
 * doesn't exist. Every path, parameter and limit below was verified against the
 * live service.
 */

export const API_BASE = "https://api.coinpaprika.com/v1";
export const LOGO_BASE = "https://static.coinpaprika.com/coin";

export interface EndpointDoc {
  id: string;
  method: "GET";
  path: string;
  summary: string;
  /** Why this app calls it, and how often. */
  usage: string;
  params?: { name: string; value: string; note: string }[];
  /** Fields the app actually reads, so the shape isn't over-promised. */
  fields: { name: string; type: string; note: string }[];
  responseSample: string;
  samples: CodeSample[];
}

const TICKERS_RESPONSE = `[
  {
    "id": "btc-bitcoin",
    "name": "Bitcoin",
    "symbol": "BTC",
    "rank": 1,
    "last_updated": "2026-07-28T16:55:14Z",
    "quotes": {
      "USD": {
        "price": 63997.72488450162,
        "volume_24h": 21896089863.796425,
        "market_cap": 1283954163502,
        "percent_change_24h": 1.42
      }
    }
  }
]`;

const GLOBAL_RESPONSE = `{
  "market_cap_usd": 2286954323581,
  "volume_24h_usd": 365808412688,
  "bitcoin_dominance_percentage": 55.99,
  "cryptocurrencies_number": 12530,
  "market_cap_change_24h": -1.33
}`;

const HISTORICAL_RESPONSE = `[
  {
    "timestamp": "2026-07-21T00:00:00Z",
    "price": 66092.81,
    "volume_24h": 26362195467,
    "market_cap": 1325781338125
  }
]`;

export const ENDPOINTS: readonly EndpointDoc[] = [
  {
    id: "tickers",
    method: "GET",
    path: "/tickers",
    summary: "Every tracked asset with its current USD quote.",
    usage:
      "Called once per session and cached for 60 seconds. Drives the market table, the ticker strip's fallbacks, the chart header and the portfolio valuation — one request for all of it.",
    params: [
      { name: "quotes", value: "USD", note: "Which quote currencies to include." },
      { name: "limit", value: "50", note: "Number of assets, ranked by market cap." },
    ],
    fields: [
      { name: "id", type: "string", note: "Stable asset identifier, e.g. btc-bitcoin." },
      { name: "rank", type: "number", note: "Market-cap rank. 0 means unranked." },
      { name: "quotes.USD.price", type: "number", note: "Current price in USD." },
      { name: "quotes.USD.market_cap", type: "number", note: "Market capitalisation." },
      { name: "quotes.USD.volume_24h", type: "number", note: "Rolling 24-hour volume." },
      { name: "quotes.USD.percent_change_24h", type: "number", note: "24-hour change, percent." },
      { name: "last_updated", type: "ISO 8601", note: "When the provider last refreshed the row." },
    ],
    responseSample: TICKERS_RESPONSE,
    samples: [
      {
        language: "JavaScript",
        code: `const response = await fetch(
  "${API_BASE}/tickers?quotes=USD&limit=50",
  { headers: { accept: "application/json" } },
);

if (!response.ok) {
  throw new Error(\`Request failed: \${response.status}\`);
}

const assets = await response.json();
console.log(assets[0].quotes.USD.price);`,
      },
      {
        language: "cURL",
        code: `curl -s "${API_BASE}/tickers?quotes=USD&limit=50" \\
  -H "accept: application/json" | jq '.[0] | {id, rank, price: .quotes.USD.price}'`,
      },
    ],
  },
  {
    id: "global",
    method: "GET",
    path: "/global",
    summary: "Aggregate market totals across every listed asset.",
    usage:
      "Called once per session. Not derivable from the top 50 — total market cap and BTC dominance are shares of roughly 12,500 assets, so computing them from 50 rows would be wrong rather than approximate.",
    fields: [
      { name: "market_cap_usd", type: "number", note: "Total market capitalisation." },
      { name: "volume_24h_usd", type: "number", note: "Total 24-hour volume." },
      { name: "bitcoin_dominance_percentage", type: "number", note: "BTC share of market cap." },
      { name: "cryptocurrencies_number", type: "number", note: "Assets the provider tracks." },
      { name: "market_cap_change_24h", type: "number", note: "24-hour change in total cap." },
    ],
    responseSample: GLOBAL_RESPONSE,
    samples: [
      {
        language: "JavaScript",
        code: `const global = await fetch("${API_BASE}/global")
  .then((response) => response.json());

console.log(global.bitcoin_dominance_percentage);`,
      },
      {
        language: "cURL",
        code: `curl -s "${API_BASE}/global" | jq '{cap: .market_cap_usd, dominance: .bitcoin_dominance_percentage}'`,
      },
    ],
  },
  {
    id: "historical",
    method: "GET",
    path: "/tickers/{assetId}/historical",
    summary: "Price history for a single asset.",
    usage:
      "The only per-asset request in the app: one for the selected chart asset, plus one per holding on the portfolio page. Responses are keyed by asset and range, so revisiting either is served from cache.",
    params: [
      {
        name: "start",
        value: "2026-07-21",
        note: "ISO date, or a full timestamp for hourly intervals.",
      },
      { name: "interval", value: "1d", note: "1h within the last 24 hours; 1d up to a year back." },
    ],
    fields: [
      { name: "timestamp", type: "ISO 8601", note: "Sample time." },
      { name: "price", type: "number", note: "Price in the quote currency." },
    ],
    responseSample: HISTORICAL_RESPONSE,
    samples: [
      {
        language: "JavaScript",
        code: `const start = new Date(Date.now() - 7 * 86_400_000)
  .toISOString()
  .slice(0, 10);

const history = await fetch(
  \`${API_BASE}/tickers/btc-bitcoin/historical?start=\${start}&interval=1d\`,
).then((response) => response.json());

// [{ timestamp: "2026-07-21T00:00:00Z", price: 66092.81, ... }]
console.log(history.length, "points");`,
      },
      {
        language: "cURL",
        code: `curl -s "${API_BASE}/tickers/btc-bitcoin/historical?start=2026-07-21&interval=1d" \\
  | jq '[.[] | {timestamp, price}] | .[0:3]'`,
      },
    ],
  },
];

export interface LimitDoc {
  label: string;
  value: string;
  note: string;
}

/** Verified against the live service, not copied from marketing pages. */
export const LIMITS: readonly LimitDoc[] = [
  {
    label: "Authentication",
    value: "None",
    note: "The endpoints this app uses are public. No key, token or signed request.",
  },
  {
    label: "CORS",
    value: "Access-Control-Allow-Origin: *",
    note: "Browsers may call the API directly, which is why this demo needs no backend proxy.",
  },
  {
    label: "Hourly history",
    value: "Last 24 hours",
    note: "Requesting 1h data older than roughly a day is rejected on the free tier.",
  },
  {
    label: "Daily history",
    value: "Last 365 days",
    note: "1d data beyond about a year is rejected on the free tier.",
  },
  {
    label: "Client timeout",
    value: "10 s",
    note: "Applied by this app, not the provider. Requests are aborted and surfaced as an error.",
  },
  {
    label: "Retry policy",
    value: "2 attempts",
    note: "Exponential backoff on 5xx and 429. 4xx is not retried — it will not start working.",
  },
];

export interface ErrorDoc {
  status: string;
  meaning: string;
  handling: string;
}

export const ERRORS: readonly ErrorDoc[] = [
  {
    status: "429",
    meaning: "Rate limit reached.",
    handling: "Surfaced as “Rate limit reached. Data will refresh shortly.” Retried with backoff.",
  },
  {
    status: "4xx",
    meaning: "Bad request or unknown asset.",
    handling: "Not retried. Shown as a generic unavailable message; the raw body never reaches the UI.",
  },
  {
    status: "5xx",
    meaning: "Provider-side failure.",
    handling: "Retried twice with backoff, then the last known data stays on screen.",
  },
  {
    status: "timeout",
    meaning: "No response within 10 seconds.",
    handling: "Aborted client-side and reported as “The request took too long.”",
  },
];
