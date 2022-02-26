import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import supabase, { hasTokenExpired } from '../lib/supabase'

// const PROTECTED_ROUTES = ['/authenticated']

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const url = req.nextUrl.clone()
  let res = NextResponse.next()

  // Skip refresh for favicon requests
  if (url.pathname === '/favicon.ico') {
    return res
  }

  const accessToken = req.cookies['sb-access-token']
  const refreshToken = req.cookies['sb-refresh-token']

  if (!accessToken || !refreshToken) {
    return res
  }

  const expired = hasTokenExpired(accessToken)
  if (expired) {
    console.log('access token expired')
    const { data: session, error } = await supabase.auth.api.refreshAccessToken(
      refreshToken
    )

    if (error) {
      res.clearCookie('sb-access-token')
      res.clearCookie('sb-refresh-token')
    }

    if (session) {
      console.log('refreshed access token')
      res.cookie('sb-access-token', session.access_token, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      if (session.refresh_token) {
        res.cookie('sb-refresh-token', session.refresh_token, {
          maxAge: 1000 * 60 * 60 * 24 * 7,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        })
      }
    }
  }

  return res

  // const { error, user } = await supabase.auth.api.getUserByCookie(
  //   {
  //     cookies: req.cookies,
  //     headers: Object.fromEntries(req.headers.entries()),
  //   },
  //   {
  //     // proxy the express get/set header function
  //     getHeader: (name: string) => {
  //       return res.headers.get(name)
  //     },
  //     setHeader: (name: string, value: string) => {
  //       return res.headers.set(name, value)
  //     },
  //   }
  // )

  // const isAuthenticated = Boolean(user)
  // if (!isAuthenticated && PROTECTED_ROUTES.includes(url.pathname)) {
  //   return NextResponse.redirect(`${url.origin}/`)
  // }

  // if (error) {
  //   console.log('error', error)

  //   if (req.cookies['sb-access-token'] || req.cookies['sb-refresh-token']) {
  // res.clearCookie('sb-access-token')
  // res.clearCookie('sb-refresh-token')
  //   }
  // }

  return res
}
