# Next.js + Supabase Edge Auth Demo

## I'm now using a different (better) approach to this same problem - check it out here: https://github.com/alaister/supabase-cookie-auth-proxy

### :warning: This is a proof of concept and a work in progress

## Concepts/Principals

I had a few goals with this demo:

1. Authenticate users in Next.js middleware
2. Refresh tokens server-side in Next.js middleware
3. Refresh tokens client-side _without a timer_
4. Keep the refresh token as an HttpOnly cookie
5. Work across multiple tabs
6. Supabase-js should work as expected without having to do anything special

These are largely achieved by storing the tokens as cookies instead of in local storage. The access token is stored as a non-HttpOnly cookie, allowing it to be read by the client, whereas the refresh token is stored as an HttpOnly cookie. Because the server-side is always doing the refresh, the client doesn't need access to the refresh token.

I have found refreshing tokens on a timer to be unreliable, leading users to be logged out randomly. This demo uses a custom supabase client that intercepts whenever a query is sent and refreshes the token (by calling an api route) beforehand.

Cookies are kept in sync by the browser across tabs, and there is little chance two refreshes will occur at exactly the same time because we're not refreshing on a timer, so the user should remain logged in for a long time.

Take a look at [lib/supabase.ts](lib/supabase.ts) to see how things work.

## Caveats/Todos

1. Does not yet support auth on dynamic paths
2. There is an edge case that can lead to all refresh tokens being revoked without a new one being issued. I'm not 100% sure if this is a gotrue server issue or something broken in this implementation. More investigation is needed.
3. detectSessionInUrl needs to be reimplemented manually, meaning after login in the current implementation, you need an extra refresh to see the auth state client-side
4. Realtime still isn't perfect, leading users to be logged out after a refresh
