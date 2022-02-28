import jwt from '@tsndr/cloudflare-worker-jwt'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import supabase, { hasTokenExpired } from '../lib/supabase'

const SKIP_REFRESH_PATHS = ['/favicon.ico', '/api/refresh']
const AUTHENTICATED_PATHS = ['/authenticated']

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const url = req.nextUrl.clone()
  let res = NextResponse.next()

  if (SKIP_REFRESH_PATHS.includes(url.pathname)) {
    return res
  }

  let accessToken = req.cookies['sb-access-token']
  let refreshToken = req.cookies['sb-refresh-token']

  const expired = hasTokenExpired(accessToken)
  if (expired) {
    const { data: session } = await supabase.auth.api.refreshAccessToken(
      refreshToken
    )

    if (session) {
      accessToken = session.access_token
      res.cookie('sb-access-token', session.access_token, {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      if (session.refresh_token) {
        refreshToken = session.refresh_token
        res.cookie('sb-refresh-token', session.refresh_token, {
          maxAge: 1000 * 60 * 60 * 24 * 7,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        })
      }
    }
  }

  let isAuthenticated = false
  if (accessToken) {
    isAuthenticated = await jwt.verify(accessToken, process.env.JWT_SECRET!)
  }

  if (!isAuthenticated && AUTHENTICATED_PATHS.includes(url.pathname)) {
    return NextResponse.redirect(`${url.origin}/`)
  }

  return res
}
