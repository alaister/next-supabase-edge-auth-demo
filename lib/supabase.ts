import { parse } from 'cookie'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SupabaseQueryBuilder } from '@supabase/supabase-js/dist/main/lib/SupabaseQueryBuilder'
import decode from 'jwt-decode'

export function hasTokenExpired(token?: string) {
  if (!token) {
    return false
  }

  const { exp } = decode<{ exp: number }>(token, {})

  return exp <= Math.floor(Date.now() / 1000)
}

export async function refresh() {
  console.log('refreshing...')

  const { refreshed, error } = await fetch(`/api/refresh`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({}),
  }).then((res) => res.json())

  return { refreshed, error }
}

let resolveRefreshingPromise: (value: unknown) => void
let refreshingPromise: Promise<unknown> | null = null
function setRefreshingPromise() {
  refreshingPromise = new Promise((resolve) => {
    resolveRefreshingPromise = resolve
  })
}

async function singletonRefresh() {
  if (refreshingPromise) {
    console.log('refreshing already in progress')
    return await refreshingPromise
  }

  setRefreshingPromise()
  await refresh()
  console.log('resolving')
  resolveRefreshingPromise(true)
  refreshingPromise = null
}

function getAccessToken() {
  const cookies = parse(document.cookie)
  const accessToken = cookies['sb-access-token']

  if (!accessToken) {
    return
  }

  return accessToken
}

async function maybeRefreshToken() {
  const expired = hasTokenExpired(getAccessToken())
  if (expired) {
    await singletonRefresh()
  }
}

interface CustomSupabaseClient extends SupabaseClient {
  _from: SupabaseClient['from']
}

interface CustomSupabaseQueryBuilder<T> extends SupabaseQueryBuilder<T> {
  _then: SupabaseQueryBuilder<T>['then']
}

let supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!,
  {
    fetch: (...args) => fetch(...args),
    autoRefreshToken: false,
    persistSession: false,
  }
) as CustomSupabaseClient

supabase.auth.session = () => {
  const accessToken = getAccessToken()

  if (!accessToken) {
    return null
  }

  return {
    access_token: accessToken,
    token_type: 'bearer',
    user: null,
  }
}

supabase._from = supabase.from
supabase.from = <T>(table: string) => {
  let queryBuilder = supabase._from<T>(table) as CustomSupabaseQueryBuilder<T>

  queryBuilder._then = queryBuilder.then
  queryBuilder.then = async (...args) => {
    const expired = hasTokenExpired(getAccessToken())
    if (expired) {
      console.log('expired:', expired)
      await singletonRefresh()
      console.log('done refreshing')
      const accessToken = getAccessToken()
      if (accessToken) {
        // @ts-ignore
        queryBuilder.headers['Authorization'] = `Bearer ${accessToken}`
      }
    }

    return await queryBuilder._then(...args)
  }

  return queryBuilder
}

// supabase.auth.session = () => ({})

// const STORAGE_KEY = 'token'

// let refreshTimer: ReturnType<typeof setTimeout>

// async function maybeRefreshToken(forceRefresh = false) {
//   console.log('maybe refresh?')
//   // Check if the current user token is not expired
//   const token = localStorage.getItem(STORAGE_KEY)
//   if (token) {
//     const { exp } = decode<{ exp: number }>(token, {})

//     if (exp * 1000 < Date.now() || forceRefresh) {
//       console.log('attempting refreshing')

//       const lockedStatus = localStorage.getItem('locked')
//       console.log(
//         'localStorage locked status:',
//         lockedStatus === 'true' ? 'locked' : 'unlocked'
//       )

//       // check if localStorage is locked
//       if (lockedStatus === 'true') {
//         console.log('localStorage is locked, stopping refresh')

//         setTimeout(() => {
//           if (localStorage.getItem('locked') === 'true') {
//             console.log(
//               'localStorage is still locked, unlocking and trying again'
//             )
//             localStorage.removeItem('refresh-lock')
//             maybeRefreshToken(forceRefresh)
//           }
//         }, 10000) // 10 second timeout

//         return
//       }

//       // lock localStorage
//       localStorage.setItem('refresh-lock', 'true')
//       console.log('locked localStorage')

//       const { access_token } = await fetch(
//         `/api/auth${forceRefresh ? '?refresh=true' : ''}`,
//         {
//           method: 'GET',
//           credentials: 'same-origin',
//         }
//       ).then((res) => res.json())

//       console.log('client side refreshed token', access_token)

//       if (access_token) {
//         localStorage.setItem(STORAGE_KEY, access_token)
//         supabase.auth.setAuth(access_token)
//       } else {
//         localStorage.removeItem(STORAGE_KEY)
//       }

//       // unlock localStorage
//       localStorage.removeItem('refresh-lock')
//       console.log('unlocked localStorage')

//       return access_token
//     }

//     return token
//   }
// }

// function setupRefreshTimer(token?: string) {
//   console.log('setup refresh timer')
//   // Check if the current user token is not expired
//   if (token) {
//     const { exp } = decode<{ exp: number }>(token, {})

//     // Always refresh at least 15 seconds before expiration, with a random
//     // offset to lessen the chances of multiple refreshes happening at the same time
//     const jitter = 15000 + Math.floor(Math.random() * 5000)

//     const timeUntilExpiration = exp * 1000 - Date.now() - jitter
//     console.log('timeUntilExpiration', timeUntilExpiration)

//     if (timeUntilExpiration > 0) {
//       console.log('setting up refresh timer')
//       clearTimeout(refreshTimer)
//       refreshTimer = setTimeout(async () => {
//         console.log('performing early refresh from timer')
//         const token = await maybeRefreshToken(true)
//         setupRefreshTimer(token)
//       }, timeUntilExpiration)
//     }
//   }
// }

if (typeof window !== 'undefined') {
  // refresh token on tab focus if needed
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      maybeRefreshToken()
    }
  })

  // keep the server in sync after a login or logout
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('onAuthStateChange', { event, session })

    // Save tokens to cookies
    fetch(`/api/auth`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ event, session }),
    })
  })
}

// Add supabase to the window for debugging
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.supabase = supabase
}

export default supabase
