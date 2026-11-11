'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AuthButton() {
  const [user, setUser] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let active = true
    fetch('/api/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.email) setUser(data.email as string)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  if (!user) {
    return (
      <Button variant="outline" size="icon" asChild title="Sign in" aria-label="Sign in">
        <a href="/login">
          <LogIn className="h-4 w-4" />
        </a>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => void handleLogout()}
      title={`Sign out (${user})`}
      aria-label={`Sign out (${user})`}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  )
}
