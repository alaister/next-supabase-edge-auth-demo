import type { NextApiRequest, NextApiResponse } from 'next'

import supabase from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // await new Promise((resolve) => setTimeout(resolve, 1500))

  const refreshToken = req.cookies['sb-refresh-token'] || null

  if (refreshToken) {
    const { data: session, error } = await supabase.auth.api.refreshAccessToken(
      refreshToken
    )

    if (error) {
      console.log('refresh failed with error:', refreshToken, error)
      return res.status(200).json({
        refreshed: false,
        error,
      })
    }

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
      })
    }
  }

  return res.status(200).json({
    refreshed: false,
  })
}
