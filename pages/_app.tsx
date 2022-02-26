import type { AppProps } from 'next/app'
import '../lib/supabase'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp
