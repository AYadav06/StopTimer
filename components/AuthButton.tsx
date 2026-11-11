'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
      <Button variant="outline" size="sm" asChild>
        <a href="/login">Sign in</a>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">{user}</span>
      <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
        Sign out
      </Button>
    </div>
  )
}
