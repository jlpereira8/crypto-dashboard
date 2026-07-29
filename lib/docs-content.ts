import type { CodeSample } from "../components/ui";

/**
 * Documentation content.
 *
 * Describes this repository as it actually is — the real scripts, the real file
 * layout, the real component names. Nothing here is placeholder prose, so it stays
 * useful and can be checked against the code.
 */

export interface DocBlock {
  kind: "prose" | "code" | "callout" | "list" | "table";
  /** prose / callout body, or a callout title via `title`. */
  text?: string;
  title?: string;
  tone?: "info" | "positive" | "warning" | "neutral";
  samples?: CodeSample[];
  caption?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
}

export interface DocSection {
  id: string;
  title: string;
  summary: string;
  blocks: DocBlock[];
}

export interface DocGroup {
  label: string;
  sections: DocSection[];
}

export const DOC_GROUPS: readonly DocGroup[] = [
  {
    label: "Getting started",
    sections: [
      {
        id: "quick-start",
        title: "Quick start",
        summary: "Clone, install, run. Three commands and no configuration.",
        blocks: [
          {
            kind: "prose",
            text: "CryptoBay is a Next.js pages-router app that reads market data directly from a public API. There is no backend, no database and no environment file — a fresh clone runs offline-free with nothing to configure.",
          },
          {
            kind: "code",
            caption: "Terminal",
            samples: [
              {
                language: "Shell",
                code: `git clone <your-fork-url> cryptobay
cd cryptobay
npm install
npm run dev`,
              },
            ],
          },
          {
            kind: "callout",
            tone: "info",
            title: "No API key needed",
            text: "The endpoints this app calls are public and send permissive CORS headers, so the browser talks to them directly. That is why there is nothing to set up.",
          },
        ],
      },
      {
        id: "scripts",
        title: "Scripts",
        summary: "Everything the project can do, and what each command checks.",
        blocks: [
          {
            kind: "table",
            columns: ["Command", "What it does"],
            rows: [
              ["npm run dev", "Development server with hot reload."],
              ["npm run build", "Production build. Type-checks and lints as part of the run."],
              ["npm run start", "Serves a production build. Requires `build` first."],
              ["npm run lint", "ESLint over every ts/tsx/js/jsx file. Zero warnings allowed."],
              ["npm run typecheck", "`tsc --noEmit` in strict mode."],
              ["npm run test", "Vitest suite, once."],
              ["npm run test:watch", "Vitest in watch mode."],
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Run the build before shipping",
            text: "`next build` runs lint and type-checking too, so a green build is the real gate. A passing dev server is not.",
          },
        ],
      },
    ],
  },
  {
    label: "Architecture",
    sections: [
      {
        id: "structure",
        title: "Project structure",
        summary: "Where each kind of code lives, and the rule that keeps it there.",
        blocks: [
          {
            kind: "prose",
            text: "Three layers, in one direction: pages compose feature components, feature components use design-system primitives, and everything reads data through hooks in lib. Nothing in lib imports a component, and no primitive knows what a crypto asset is.",
          },
          {
            kind: "code",
            caption: "Directory layout",
            samples: [
              {
                language: "Text",
                code: `lib/                  data, derivation, formatting — no JSX
  market-api.ts       typed fetchers + normalisation
  market-view.ts      search / sort / filter / pagination (pure)
  portfolio.ts        sample holdings + valuation (pure)
  useMarketData.ts    React Query wiring
  usePortfolio.ts     valuation + performance history
  format.ts           Intl formatters, built once
  motion.ts           duration / easing tokens

components/
  ui/                 design system — knows nothing about crypto
  charts/             PriceChart, DonutChart (SVG over d3 scales)
  dashboard/          overview panels
  markets/            markets-route table
  layout/             AppShell, SidebarNav

pages/                route composition only`,
              },
            ],
          },
          {
            kind: "callout",
            tone: "positive",
            title: "Why derivation is pure",
            text: "Search, sorting, filtering, pagination and portfolio valuation are plain functions over their inputs. They are directly testable, and it is obvious at a glance that none of them can trigger a network request.",
          },
        ],
      },
      {
        id: "data-flow",
        title: "Data flow",
        summary: "Three requests power the whole product.",
        blocks: [
          {
            kind: "list",
            items: [
              "The market list is fetched once and cached for 60 seconds.",
              "Global totals are fetched once — they cannot be derived from 50 of ~12,500 assets.",
              "Price history is fetched per asset and range, keyed so revisiting either hits the cache.",
              "Search, sort, filter and pagination never refetch. They derive from the loaded list.",
              "The portfolio is valued from that same list, so it costs no additional request.",
            ],
          },
          {
            kind: "code",
            caption: "Reading data in a component",
            samples: [
              {
                language: "TypeScript",
                code: `import { useTopAssets } from "../lib/useMarketData";
import { deriveMarketView, DEFAULT_SORT } from "../lib/market-view";

const { assets, isLoading, isError, refetch } = useTopAssets();

// Local, memoised, request-free.
const view = deriveMarketView({
  assets: assets ?? [],
  search: "bit",
  filter: "gainers",
  sort: DEFAULT_SORT,
  page: 0,
});`,
              },
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Missing is not zero",
            text: "A field the provider omits is normalised to null, never 0, and renders as an em dash. A market cap of zero is a claim; a missing one is an absence.",
          },
        ],
      },
    ],
  },
  {
    label: "Design system",
    sections: [
      {
        id: "tokens",
        title: "Design tokens",
        summary: "Every colour, radius and shadow is a CSS custom property.",
        blocks: [
          {
            kind: "prose",
            text: "Components name tokens, never raw values. Tokens are declared once in globals.css and exposed through the Tailwind theme, so switching themes changes one block and nothing else. Dark mode needs no `dark:` variants anywhere — the tokens are redefined under `.dark` and every surface follows.",
          },
          {
            kind: "code",
            caption: "globals.css",
            samples: [
              {
                language: "CSS",
                code: `:root {
  --color-canvas: #f1f2f4;   /* recessed: sidebar, tool rails */
  --color-surface: #ffffff;  /* raised: workspace regions */
  --color-ink: #18181b;
  --color-positive: #006300;
  --color-negative: #b42323;
}

.dark {
  --color-canvas: #08090b;
  --color-surface: #121417;
  --color-ink: #f7f8f8;
  --color-positive: #3fcf5c;
  --color-negative: #ff6e6e;
}`,
              },
              {
                language: "TSX",
                code: `// Name the token, never the value.
<div className="bg-surface text-ink ring-1 ring-line">
  <p className="text-ink-muted">Secondary</p>
</div>`,
              },
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Opacity modifiers do not work on these",
            text: "Tailwind 3 silently drops utilities like `ring-negative/20` when the colour is a var(). It emits no CSS at all. Add an explicit token instead — that is what `--color-negative-line` exists for.",
          },
        ],
      },
      {
        id: "components",
        title: "Components",
        summary: "The primitives, and the contract each one keeps.",
        blocks: [
          {
            kind: "table",
            columns: ["Component", "Contract"],
            rows: [
              ["Card", "Hairline panel. Elevation lives at the edge, not in a shadow."],
              ["Button", "Variants + sizes, a loading state that holds its width, real focus ring."],
              ["Input / Select / Field", "Field wires label, hint, error and aria-describedby for you."],
              ["Table", "Sticky header, aria-sort, two divider weights for density."],
              ["DeltaPill", "Signed change: caret, sign and colour — direction never rests on hue."],
              ["EmptyState", "One component for empty, no-results and error states."],
              ["Skeleton", "Masked shimmer, aria-hidden so placeholders stay silent."],
              ["Modal / Drawer", "Focus trap, Escape, scroll lock, focus restored on close."],
              ["CodeBlock", "Language tabs and copy-to-clipboard. Text nodes, never innerHTML."],
              ["PriceChart / DonutChart", "SVG over d3 scales. Charts are aria-hidden or summarised."],
            ],
          },
          {
            kind: "code",
            caption: "Composing a panel",
            samples: [
              {
                language: "TSX",
                code: `import { Card, CardHeader, CardTitle, Badge } from "../components/ui";

<Card padding="none">
  <CardHeader bleed>
    <CardTitle>Holdings</CardTitle>
    <Badge tone="accent">Live</Badge>
  </CardHeader>
  {/* rows */}
</Card>`,
              },
            ],
          },
        ],
      },
      {
        id: "charts",
        title: "Charts",
        summary: "Hand-drawn SVG, and the rules that keep them honest.",
        blocks: [
          {
            kind: "list",
            items: [
              "Linear interpolation, never a spline: a curve through daily closes invents prices that never traded.",
              "The price axis sits on the right, beside the live edge of the series.",
              "Direction drives colour, and the header always prints the signed percentage beside a caret.",
              "The draw-in replays only when the asset or range changes, never on a background refresh.",
              "Charts are aria-hidden or carry a text summary; every value is also readable as text.",
              "Arrow keys walk the series, feeding the same readout the pointer does.",
            ],
          },
          {
            kind: "callout",
            tone: "info",
            title: "Two libraries became none",
            text: "An earlier revision shipped ApexCharts and Nivo at the same time — roughly 600 KB — for four charts. Both were replaced by ~150 lines of SVG over d3-scale and d3-shape, which also made the charts themeable from CSS custom properties.",
          },
        ],
      },
    ],
  },
  {
    label: "Reference",
    sections: [
      {
        id: "accessibility",
        title: "Accessibility",
        summary: "What is guaranteed, and how it is checked.",
        blocks: [
          {
            kind: "list",
            items: [
              "Every ink and status pair meets WCAG AA on the surface it renders on; ratios are computed, not eyeballed.",
              "Chart series colours clear the colour-vision separation gates in both themes.",
              "One focus treatment app-wide, via a :focus-visible outline that traces the element's own radius.",
              "Tables use aria-sort, a caption, and buttons whose names say what activating them does.",
              "Dialogs trap focus, close on Escape, lock scroll and restore focus on close.",
              "Status is never colour alone — a glyph and a word always accompany it.",
              "prefers-reduced-motion is honoured by Framer Motion and by a global CSS damper.",
            ],
          },
          {
            kind: "callout",
            tone: "positive",
            title: "Palette checks are runnable",
            text: "Contrast ratios and colour-vision separation are verified with a script rather than by judgement, so a token change that breaks a pair is caught rather than shipped.",
          },
        ],
      },
      {
        id: "testing",
        title: "Testing",
        summary: "What is covered, and what deliberately is not.",
        blocks: [
          {
            kind: "prose",
            text: "Vitest with jsdom and Testing Library. The suite favours pure derivation and one integration path over broad component snapshots — snapshots of a design system break on every restyle and assert nothing about behaviour.",
          },
          {
            kind: "list",
            items: [
              "Normalisation: missing fields stay null, rank 0 falls back to list position, bad numbers never become NaN.",
              "Derivation: sorting, search, filters, pagination and clamping.",
              "Portfolio: share maths, the folded Other segment, ring closure to 100%, empty portfolios.",
              "Formatting: every formatter renders an em dash for null, undefined, NaN and Infinity.",
              "Integration: selecting a row re-points the chart and costs exactly one request.",
            ],
          },
          {
            kind: "code",
            caption: "Running the suite",
            samples: [
              {
                language: "Shell",
                code: `npm run test          # once
npm run test:watch    # watch mode
npx vitest run tests/market-view.test.ts   # a single file`,
              },
            ],
          },
        ],
      },
      {
        id: "faq",
        title: "FAQ",
        summary: "The questions this codebase actually raises.",
        blocks: [
          {
            kind: "prose",
            text: "**Why is there no backend?** Nothing needs one. The data source is public and CORS-permissive, so a browser can read it directly. Adding a proxy would mean a server to deploy and a cache to invalidate, in exchange for nothing a visitor would notice.",
          },
          {
            kind: "prose",
            text: "**Why are the portfolio holdings fake?** There is no wallet integration. Units and cost basis are fixtures — but they are the *only* fixed numbers: value, P/L, allocation and the performance curve are all computed from live prices, so the arithmetic is real even though the premise is a sample.",
          },
          {
            kind: "prose",
            text: "**Why no sparkline in the market table?** The markets endpoint returns no price arrays. Drawing fifty sparklines would mean fifty history requests, which costs more than the column is worth.",
          },
          {
            kind: "prose",
            text: "**Why does 7D look angular?** The free data tier only serves daily granularity beyond 24 hours, so a week is eight points. The chart draws exactly the points it has rather than smoothing between them.",
          },
          {
            kind: "prose",
            text: "**Is the status page real?** Yes — it probes the live endpoints from your browser and reports what it measures. It shows no long-run uptime history because this app stores none, and inventing that figure would be inventing an operational record.",
          },
        ],
      },
    ],
  },
];

export const ALL_SECTIONS: readonly DocSection[] = DOC_GROUPS.flatMap((group) => group.sections);

export interface DocSearchHit {
  section: DocSection;
  group: string;
}

/**
 * Substring search across titles, summaries and block text.
 *
 * A title match outranks a summary match, which outranks body text — so typing
 * "tokens" lands on the tokens page rather than on whichever page mentions the
 * word most often.
 */
export function searchDocs(query: string): DocSearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const scored: { hit: DocSearchHit; score: number }[] = [];

  for (const group of DOC_GROUPS) {
    for (const section of group.sections) {
      const title = section.title.toLowerCase();
      const summary = section.summary.toLowerCase();
      const body = section.blocks
        .map((block) =>
          [block.title, block.text, ...(block.items ?? []), ...(block.rows?.flat() ?? [])]
            .filter(Boolean)
            .join(" "),
        )
        .join(" ")
        .toLowerCase();

      let score = 0;
      if (title.startsWith(needle)) score = 4;
      else if (title.includes(needle)) score = 3;
      else if (summary.includes(needle)) score = 2;
      else if (body.includes(needle)) score = 1;

      if (score > 0) scored.push({ hit: { section, group: group.label }, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.hit);
}
