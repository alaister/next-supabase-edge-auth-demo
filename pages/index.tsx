import type { NextPage } from 'next'
import { useCallback, useEffect, useState } from 'react'
import supabase from '../lib/supabase'

const Home: NextPage = () => {
  const [response, setResponse] = useState<any>({})

  const fetchResponse = useCallback(() => {
    supabase
      .from('users')
      .select('*')
      .maybeSingle()
      .then((response) => setResponse(response))
  }, [])

  useEffect(() => {
    fetchResponse()
  }, [fetchResponse])

  return (
    <div>
      <h1>Hello Next.js</h1>
      <pre>
        <code>{JSON.stringify(response, null, 2)}</code>
      </pre>
      <button onClick={fetchResponse}>Refetch</button>
    </div>
  )
}

export default Home
