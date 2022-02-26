import type { AppProps } from 'next/app'
import 'simpledotcss/simple.min.css'
import '../lib/supabase'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp
