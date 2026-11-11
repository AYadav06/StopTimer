import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE = 'timer_session'

/** Opaque session token issued on login. In production this should be a
 * signed JWT or a database-backed session; for now a random token stored in
 * an HttpOnly cookie is sufficient to gate the dashboard. */
export async function createSession(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: !!process.env.VERCEL,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: !!process.env.VERCEL,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

/** Returns the email of the signed-in user, or null. */
export async function getCurrentUser(): Promise<string | null> {
  return await getSessionToken()
}

/** Call in Server Components / route handlers to require auth. */
export function requireAuth(): void {
  if (!getSessionToken()) {
    redirect('/login')
  }
}
