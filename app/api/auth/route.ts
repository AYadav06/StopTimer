import { NextResponse, type NextRequest } from 'next/server'
import { createSession, destroySession } from '@/lib/auth'
import { createUser, ensureSchema, verifyPassword } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  let payload: { email?: unknown; password?: unknown }
  try {
    payload = (await request.json()) ?? {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''

  try {
    await ensureSchema()
  } catch (error) {
    console.error('Schema init failed', error)
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 500 })
  }

  if (action === 'register') {
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 },
      )
    }

    try {
      const { created } = await createUser(email, password)
      if (!created) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 },
        )
      }
      await createSession(email)
      return NextResponse.json({ ok: true, created: true })
    } catch (error) {
      console.error('Register failed', error)
      return NextResponse.json(
        { error: 'Could not create account.' },
        { status: 500 },
      )
    }
  }

  // login
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 },
    )
  }

  const ok = await verifyPassword(email, password)
  if (!ok) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 },
    )
  }

  await createSession(email)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
