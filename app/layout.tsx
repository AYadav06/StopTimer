import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Timer Dashboard',
  description: 'Track timer sessions and review per-day totals.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
