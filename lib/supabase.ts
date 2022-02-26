import { parse } from 'cookie'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SupabaseQueryBuilder } from '@supabase/supabase-js/dist/main/lib/SupabaseQueryBuilder'
import decode from 'jwt-decode'

export function hasTokenExpired(token: string) {
  const { exp } = decode<{ exp: number }>(token, {})

  return exp <= Math.floor(Date.now() / 1000)
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

supabase._from = supabase.from
supabase.from = <T>(table: string) => {
  let queryBuilder = supabase._from<T>(table) as CustomSupabaseQueryBuilder<T>

  queryBuilder._then = queryBuilder.then
  queryBuilder.then = (...args) => {
    console.log('custom query builder then')
    return queryBuilder._then(...args)
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

// if (typeof window !== 'undefined') {
//   ;(async () => {
//     // maybeRefreshToken on page load
//     const token = await maybeRefreshToken()
//     setupRefreshTimer(token)
//   })()

//   // maybeRefreshToken on tab focus
//   document.addEventListener('visibilitychange', async () => {
//     if (document.visibilityState === 'visible') {
//       const token = await maybeRefreshToken()
//       setupRefreshTimer(token)
//     }
//   })

//   // keep the supabase client in sync with localStorage
//   window.addEventListener('storage', (e) => {
//     if (e.key === STORAGE_KEY && e.newValue) {
//       console.log('setting token from other tab')
//       supabase.auth.setAuth(e.newValue)

//       // restart the refresh timer as the token has already been refreshed
//       setupRefreshTimer(e.newValue)
//     }
//   })

//   // keep the server in sync after a login or logout
//   supabase.auth.onAuthStateChange((event, session) => {
//     console.log('onAuthStateChange', { event, session })

//     // Save token to local storage
//     const token = session?.access_token
//     if (token) {
//       localStorage.setItem(STORAGE_KEY, token)
//       setupRefreshTimer(token)
//     }

//     // Save tokens to cookies
//     fetch(`/api/auth`, {
//       method: 'POST',
//       credentials: 'same-origin',
//       headers: new Headers({
//         'Content-Type': 'application/json',
//       }),
//       body: JSON.stringify({ event, session }),
//     })
//   })
// }

// Add supabase to the window for debugging
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  // @ts-ignore
  window.supabase = supabase
  window.parseCookies = parse
  window.hasTokenExpired = hasTokenExpired
}

export default supabase
