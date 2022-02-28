import { Deferred } from '@mike-north/types'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SupabaseQueryBuilder } from '@supabase/supabase-js/dist/main/lib/SupabaseQueryBuilder'
import { parse } from 'cookie'
import decode from 'jwt-decode'

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
    // detectSessionInUrl: false,
    // TODO: detect the session in the url manually and set it
    // using the same "then" waiting as a normal refresh
    // using something like: Object.fromEntries(new URLSearchParams(new URL(window.location.href).hash.replace('#', '?')))
  }
) as CustomSupabaseClient

export function getAccessToken() {
  const cookies = parse(document.cookie)
  const accessToken = cookies['sb-access-token']

  if (!accessToken) {
    return
  }

  return accessToken
}

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

  // Update the realtime client
  const token = getAccessToken()
  if (token) {
    //@ts-ignore
    supabase.realtime.setAuth(token)
  }

  return { refreshed, error }
}

let refreshingDeferred: Deferred<any> | null = null

function setRefreshingDeferred() {
  refreshingDeferred = new Deferred()
}
function resolveRefreshingDeferred() {
  refreshingDeferred?.resolve()
  refreshingDeferred = null
}

async function singletonRefresh() {
  if (refreshingDeferred) {
    console.log('refreshing already in progress')
    return await refreshingDeferred.promise
  }

  setRefreshingDeferred()
  await refresh()
  console.log('done refreshing')
  resolveRefreshingDeferred()
}

async function maybeRefreshToken() {
  const expired = hasTokenExpired(getAccessToken())
  if (expired) {
    await singletonRefresh()
  }
}

// Override how supabase-js looks up the access token, getting it from the cookie
// instead of localStorage
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

// Here we're intercepting the "then" method of the query builder,
// allow us to always ensure that the query is sent with a refreshed token
supabase._from = supabase.from
supabase.from = <T>(table: string) => {
  let queryBuilder = supabase._from<T>(table) as CustomSupabaseQueryBuilder<T>

  queryBuilder._then = queryBuilder.then
  queryBuilder.then = async (...args) => {
    const expired = hasTokenExpired(getAccessToken())
    if (expired) {
      console.log('access token expired; attempting refresh')
      await singletonRefresh()

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

if (typeof window !== 'undefined') {
  // Add supabase to the window for debugging
  // @ts-ignore
  window.supabase = supabase

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

export default supabase
