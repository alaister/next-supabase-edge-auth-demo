import { serialize } from 'cookie'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { event, session } = req.body
  if (event) {
    if (event === 'SIGNED_IN' && session) {
      const { access_token, refresh_token } = session

      res.setHeader('set-cookie', [
        serialize('sb-access-token', access_token, {
          maxAge: 31540000, // 1 year
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        }),
        ...(refresh_token
          ? [
              serialize('sb-refresh-token', refresh_token, {
                maxAge: 31540000, // 1 year
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              }),
            ]
          : []),
      ])
    }

    if (event === 'SIGNED_OUT') {
      res.setHeader('set-cookie', [
        `sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        `sb-refresh-token=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      ])
    }
  }

  res.status(200).json({})
}
