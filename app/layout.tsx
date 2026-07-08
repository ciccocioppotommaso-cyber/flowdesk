import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Manrope, Space_Mono } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'Flowest',
  description: 'Il tuo business gestisce se stesso. Tu pensi a crescere.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="it" className={`${manrope.variable} ${spaceMono.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}