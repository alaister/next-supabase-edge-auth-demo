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
    console.log('fetching...')

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
      <h1>Posts</h1>

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
            fetchData()
            fetchData()
          }}
        >
          Refetch
        </button>
      </div>
    </div>
  )
}

export default Home
