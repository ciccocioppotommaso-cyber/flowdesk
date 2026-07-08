import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist">
      <SignUp
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