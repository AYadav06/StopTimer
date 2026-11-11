'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthButtonProps {
  className?: string
}

export function AuthButton({ className }: AuthButtonProps) {
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
  }

  if (!user) {
    return (
      <a className={`button ghost small ${className ?? ''}`} href="/login">
        Sign in
      </a>
    )
  }

  return (
    <div className={`auth-user ${className ?? ''}`}>
      <span className="auth-email">{user}</span>
      <button type="button" className="button ghost small" onClick={() => void handleLogout()}>
        Sign out
      </button>
    </div>
  )
}
