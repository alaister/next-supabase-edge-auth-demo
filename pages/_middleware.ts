import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import supabase from '../lib/supabase'

// const PROTECTED_ROUTES = ['/authenticated']

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const url = req.nextUrl.clone()
  let res = NextResponse.next()

  // Skip refresh for favicon requests
  if (url.pathname === '/favicon.ico') {
    return res
  }

  const { error, user } = await supabase.auth.api.getUserByCookie(
    {
      cookies: req.cookies,
      headers: Object.fromEntries(req.headers.entries()),
    },
    {
      // proxy the express get/set header function
      getHeader: (name: string) => {
        return res.headers.get(name)
      },
      setHeader: (name: string, value: string) => {
        return res.headers.set(name, value)
      },
    }
  )

  // const isAuthenticated = Boolean(user)
  // if (!isAuthenticated && PROTECTED_ROUTES.includes(url.pathname)) {
  //   return NextResponse.redirect(`${url.origin}/`)
  // }

  if (error) {
    console.log('error', error)

    if (req.cookies['sb-access-token'] || req.cookies['sb-refresh-token']) {
      res.clearCookie('sb-access-token')
      res.clearCookie('sb-refresh-token')
    }
  }

  return res
}
