import Link from 'next/link'

const AuthenticatedIndex = () => {
  return (
    <div>
      <h1>You&apos;re Authenticated</h1>
      <Link href="/">
        <a>Home</a>
      </Link>
      <p>
        Note: We&apos;re not doing client side auth in this demo. So you&apos;ll
        only be authenticated if you visit this route from a full request.
      </p>
    </div>
  )
}

export default AuthenticatedIndex
