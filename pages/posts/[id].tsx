import type { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import supabase from '../../lib/supabase'

const Post: NextPage = () => {
  const router = useRouter()
  const id = router.query.id

  const [post, setPost] = useState<{
    id: string
    created_at: string
    title: string
    public: boolean
  } | null>(null)

  const fetchPost = useCallback(() => {
    if (!id) {
      return
    }

    console.log('fetching post...')

    supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPost(data)
        }
      })
  }, [id])

  const [comments, setComments] = useState<
    {
      id: string
      created_at: string
      user_id: string
      post_id: string
      body: string
    }[]
  >([])

  const fetchComments = useCallback(() => {
    if (!id) {
      return
    }

    console.log('fetching comments...')

    supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .then(({ data }) => {
        if (data) {
          setComments(data)
        }
      })
  }, [id])

  useEffect(() => {
    fetchPost()
    fetchComments()
  }, [fetchComments, fetchPost])

  useEffect(() => {
    const sub = supabase
      .from('comments')
      .on('INSERT', (payload) => {
        console.log('comments inserted:', payload)
        setComments((comments) => [...comments, payload.new])
      })
      .subscribe()

    return () => {
      sub.unsubscribe()
    }
  }, [])

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const form = e.currentTarget

      const formData = new FormData(form)
      const body = formData.get('body')

      if (id && body) {
        supabase
          .from('comments')
          .insert({
            post_id: id,
            body,
          })
          .then((result) => {
            console.log('inserted comment:', result)

            form.reset()
          })
      }
    },
    [id]
  )

  if (!post) {
    return <h2>Loading...</h2>
  }

  return (
    <div>
      <h1>{post.title}</h1>

      <hr />

      <h3>Comments</h3>
      <ul>
        {comments.map(({ id, body }) => (
          <li key={id}>{body}</li>
        ))}
      </ul>
      <form onSubmit={onSubmit}>
        <input name="body" type="text" placeholder="Comment" />
        <button type="submit">Add Comment</button>
      </form>

      <button
        onClick={() => {
          fetchPost()
          fetchComments()
        }}
      >
        Refetch
      </button>
    </div>
  )
}

export default Post
