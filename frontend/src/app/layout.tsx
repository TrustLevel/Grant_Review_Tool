// app/layout.tsx

import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from './lib/auth'

export const metadata: Metadata = {
  title: 'TrustLevel Review Tool',
  description: 'Proposal review tool for Project Catalyst',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}