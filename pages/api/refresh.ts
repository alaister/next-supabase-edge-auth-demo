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

  // await new Promise((resolve) => setTimeout(resolve, 1500))

  console.log(
    'setCOOKIE',
    res.getHeader('set-cookie'),
    res.getHeader('Set-Cookie')
  )
  const setCookie = res.getHeader('set-cookie') as any

  const setCookies = parse(setCookie, { map: true })

  const newRefreshToken = setCookies['sb-refresh-token']?.value || null
  const refreshToken = req.cookies['sb-refresh-token'] || null

  // if newRefreshToken exists, the tokens have already been refreshed been refreshed
  // by the next.js middleware
  if (newRefreshToken) {
    console.log(
      'already refreshed in middleware',
      refreshToken,
      newRefreshToken
    )

    return res.status(200).json({
      refreshed: true,
    })
  }

  if (refreshToken) {
    console.log('refreshing in endpoint', refreshToken, setCookies)
    const { data: session, error } = await supabase.auth.api.refreshAccessToken(
      refreshToken
    )

    if (error) {
      console.log('refresh failed with error:', error)
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
