import type { NextPage } from 'next'
import { useCallback, useEffect, useState } from 'react'
import supabase from '../lib/supabase'

const Home: NextPage = () => {
  const [data, setData] = useState<any>({})

  const fetchData = useCallback(() => {
    console.log('fetching...')

    supabase
      .from('posts')
      .select('*')
      .then(({ data }) => setData(data))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div>
      <h1>Hello Next.js</h1>
      <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
      <button
        onClick={() => {
          fetchData()
          fetchData()
        }}
      >
        Refetch
      </button>
    </div>
  )
}

export default Home
