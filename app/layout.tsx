import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Timer — Focus Dashboard',
  description:
    'Track focus sessions, keep a daily streak, and export your session history as a PDF.',
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#07080d',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
