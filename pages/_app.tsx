import '../globals.css'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ backgroundColor: "#E3E3E3", minHeight: "100vh" }}>
        <Component {...pageProps} />
      </div>
    </QueryClientProvider>
  )
}
