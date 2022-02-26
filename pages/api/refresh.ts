import type { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'set-cookie-parser'
import supabase from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const setCookie = res.getHeader('set-cookie') as any
  const setCookies = parse(setCookie, { map: true })

  const refreshToken = req.cookies['sb-refresh-token'] || null
  const newRefreshToken = setCookies['sb-refresh-token']?.value || null

  // if newRefreshToken exists, the tokens have already been refreshed been refreshed
  // by the next.js middleware
  if (newRefreshToken) {
    return res.status(200).json({
      refreshed: true,
    })
  }

  if (refreshToken) {
    const { data: session, error } = await supabase.auth.api.refreshAccessToken(
      refreshToken
    )

    if (session) {
      const { access_token, refresh_token } = session

      res.setHeader('set-cookie', [
        `sb-access-token=${access_token}; Path=/; Expires=${new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 7
        ).toUTCString()}`,
        `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; Expires=${new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 7
        ).toUTCString()}`,
      ])

      return res.status(200).json({
        refreshed: true,
      })
    } else {
      return res.status(200).json({
        refreshed: false,
        error,
      })
    }
  }

  return res.status(200).json({
    refreshed: false,
  })
}
