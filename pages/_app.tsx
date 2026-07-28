import "../globals.css";
import { useState } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { Inter } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell";
import { THEME_INIT_SCRIPT } from "../lib/useTheme";

/**
 * Self-hosted via next/font instead of a Google Fonts <link>. That removes two
 * preconnects and a render-blocking stylesheet from the critical path, and the
 * `size-adjust` fallback metrics it generates mean no layout shift when the real
 * face swaps in.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  // Only the weights the design system actually uses.
  weight: ["400", "500", "600"],
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // One client for the app's lifetime; created lazily so it is never shared
  // between requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Per-query options in lib/useMarketData.ts refine these.
            refetchOnWindowFocus: false,
            staleTime: 60_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>CryptoBay — Market overview</title>
        <meta
          name="description"
          content="Live cryptocurrency prices, market KPIs and asset conversion."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CryptoBay" />
        {/* Must match --color-canvas in globals.css for both schemes.
            Distinct `key`s are required: next/head dedupes <meta> by `name`, so
            without them the second tag silently replaces the first and only one
            scheme gets a colour. */}
        <meta
          key="theme-color-light"
          name="theme-color"
          content="#f7f7f8"
          media="(prefers-color-scheme: light)"
        />
        <meta
          key="theme-color-dark"
          name="theme-color"
          content="#08090a"
          media="(prefers-color-scheme: dark)"
        />

        {/* Warm up both origins before React has hydrated: the API, and the
            static CDN the asset logos come from. */}
        <link rel="preconnect" href="https://api.coinpaprika.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://static.coinpaprika.com" crossOrigin="anonymous" />

        {/* Applies the stored theme before first paint, so there is no flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </Head>

      <div className={`${inter.variable} font-sans text-ink antialiased`}>
        <AppShell routeKey={router.asPath}>
          <Component {...pageProps} />
        </AppShell>
      </div>
    </QueryClientProvider>
  );
}
