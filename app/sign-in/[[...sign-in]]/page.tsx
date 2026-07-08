import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#1F52FF',
            colorForeground: '#0B1533',
          },
        }}
      />
    </main>
  )
}