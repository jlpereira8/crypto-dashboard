import '../globals.css'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import Head from "next/head";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const ls = localStorage.getItem('theme');
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const dark = ls ? ls === 'dark' : prefersDark;
                const c = document.documentElement.classList;
                dark ? c.add('dark') : c.remove('dark');
              } catch (e) {}
            })();`,
          }}
        />
      </Head>
      <div className="min-h-screen bg-[#E3E3E3] text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <Component {...pageProps} />
      </div>
    </QueryClientProvider>
  )
}
