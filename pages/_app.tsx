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
 *
 * The family is published as a `:root` custom property rather than by putting the
 * generated class on a wrapper element. Next's own pages-router example uses a
 * wrapper, but anything rendered through a portal — every Modal and Drawer in this
 * app mounts on <body> — falls outside it and drops to the browser's default
 * serif. Declaring it on `:root` means portalled content inherits too.
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
        {/* No static theme-color here on purpose: the theme store creates and
            owns the tag (see lib/useTheme.ts). A declared one isn't reliably in
            the DOM when the blocking script runs, so its first update was lost. */}

        {/* Warm up both origins before React has hydrated: the API, and the
            static CDN the asset logos come from. */}
        <link rel="preconnect" href="https://api.coinpaprika.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://static.coinpaprika.com" crossOrigin="anonymous" />

        {/* Publish the font family globally so portalled overlays inherit it. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--font-sans:${inter.style.fontFamily};}`,
          }}
        />

        {/* Applies the stored theme before first paint, so there is no flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </Head>

      <AppShell routeKey={router.asPath}>
        <Component {...pageProps} />
      </AppShell>
    </QueryClientProvider>
  );
}
