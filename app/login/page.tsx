'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Timer, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/auth?action=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(data?.error ?? 'Authentication failed.')
        return
      }
      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative z-10 grid w-full grid-cols-1 lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="hidden flex-col justify-between border-r border-border bg-gradient-to-br from-primary/10 via-background to-violet-500/10 p-12 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Timer</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Focus dashboard
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Stay consistent. Build momentum.
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Track your focus.
              <br />
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                Keep the streak alive.
              </span>
            </h2>
            <p className="max-w-md text-muted-foreground">
              Every focused session is another mile. Show up daily, keep your streak
              alive, and let the momentum carry you.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Sessions stored securely in Postgres on Neon.
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center p-6 sm:p-12">
          <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-2xl backdrop-blur">
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
                <Timer className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </CardTitle>
              <CardDescription>
                {mode === 'login'
                  ? 'Sign in to continue to your dashboard.'
                  : 'Start tracking your focus sessions today.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy
                    ? 'Working…'
                    : mode === 'login'
                      ? 'Sign in'
                      : 'Create account'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode((m) => (m === 'login' ? 'register' : 'login'))
                    setError(null)
                  }}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {mode === 'login' ? 'Create one' : 'Sign in'}
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
