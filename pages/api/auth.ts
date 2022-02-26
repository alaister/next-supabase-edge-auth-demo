import type { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'set-cookie-parser'
import supabase from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // If supabase has refreshed the token in the middleware, we must use those new cookies
    // instead of the outdated ones from the request
    const setCookie = res.getHeader('set-cookie') as any
    const setCookies = parse(setCookie, { map: true })

    let access_token =
      setCookies['sb-access-token']?.value ||
      req.cookies['sb-access-token'] ||
      null
    let refresh_token =
      setCookies['sb-refresh-token']?.value ||
      req.cookies['sb-refresh-token'] ||
      null

    // if setCookies exists, the tokens have just been refreshed
    if (
      req.query.refresh &&
      refresh_token &&
      !setCookies['sb-refresh-token']?.value
    ) {
      console.log('FORCING REFRESH')
      const { data: session } = await supabase.auth.api.refreshAccessToken(
        refresh_token
      )

      if (session) {
        access_token = session.access_token
        refresh_token = session.refresh_token ?? null

        res.setHeader('set-cookie', [
          `sb-access-token=${access_token}; Path=/; HttpOnly; Expires=${new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7
          ).toUTCString()}`,
          `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; Expires=${new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7
          ).toUTCString()}`,
        ])
      }
    }

    return res.status(200).json({ access_token, refresh_token })
  }

  if (req.method === 'POST') {
    return supabase.auth.api.setAuthCookie(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method Not Allowed' })
}
