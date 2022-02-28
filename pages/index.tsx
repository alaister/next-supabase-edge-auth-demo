import type { NextPage } from 'next'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import supabase from '../lib/supabase'

const Home: NextPage = () => {
  const [data, setData] = useState<
    {
      id: string
      created_at: string
      title: string
      public: boolean
    }[]
  >([])

  const fetchData = useCallback(() => {
    console.log('fetching posts...')

    supabase
      .from('posts')
      .select('*')
      .then(({ data }) => {
        if (data) {
          setData(data)
        }
      })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div>
      <h1>Example Posts</h1>

      <ul>
        {data.map(({ id, title }) => (
          <li key={id}>
            <Link href={`/posts/${id}`}>
              <a>{title}</a>
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <button
          onClick={() => {
            supabase.auth.signIn({
              provider: 'github',
            })
          }}
        >
          Login with GitHub
        </button>

        <button
          onClick={() => {
            supabase.auth.signOut()
          }}
        >
          Logout
        </button>

        <button
          onClick={() => {
            // sending two requests to test if multiple requests try to refresh at the same time
            fetchData()
            fetchData()
          }}
        >
          Refetch
        </button>
      </div>

      <div>
        Try visiting <code>/authenticated</code>
      </div>
    </div>
  )
}

export default Home
