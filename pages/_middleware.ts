import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import supabase, { hasTokenExpired } from '../lib/supabase'

const SKIP_REFRESH_PATHS = ['/favicon.ico', '/api/refresh']

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const url = req.nextUrl.clone()
  let res = NextResponse.next()

  if (SKIP_REFRESH_PATHS.includes(url.pathname)) {
    return res
  }

  const accessToken = req.cookies['sb-access-token']
  const refreshToken = req.cookies['sb-refresh-token']

  if (!accessToken || !refreshToken) {
    return res
  }

  const expired = hasTokenExpired(accessToken)
  if (expired) {
    console.log('access token expired, attempting refresh')
    const { data: session } = await supabase.auth.api.refreshAccessToken(
      refreshToken
    )

    if (session) {
      console.log('refreshed access token', session.refresh_token)
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
}
