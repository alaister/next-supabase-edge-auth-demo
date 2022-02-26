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
  if (event && session) {
    if (event === 'SIGNED_IN') {
      const { access_token, refresh_token } = session

      res.setHeader('set-cookie', [
        `sb-access-token=${access_token}; Path=/; Expires=${new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 7
        ).toUTCString()}`,
        `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; Expires=${new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 7
        ).toUTCString()}`,
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
