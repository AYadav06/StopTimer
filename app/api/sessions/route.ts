import { NextResponse, type NextRequest } from 'next/server'
import { ensureSchema, pool } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isValidDate, isValidTimeZone, toSession, type SessionRow } from '@/lib/sessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const tz = searchParams.get('tz') ?? 'UTC'

  if (date && !isValidDate(date)) {
    return NextResponse.json({ error: '`date` must be formatted as YYYY-MM-DD.' }, { status: 400 })
  }
  if (!isValidTimeZone(tz)) {
    return NextResponse.json({ error: '`tz` must be a valid IANA time zone.' }, { status: 400 })
  }

  try {
    await ensureSchema()
    const result = date
      ? await pool.query<SessionRow>(
          `SELECT * FROM timer_sessions
           WHERE user_email = $1
             AND (created_at AT TIME ZONE $2)::date = $3::date
           ORDER BY created_at DESC`,
          [user, tz, date],
        )
      : await pool.query<SessionRow>(
          `SELECT * FROM timer_sessions
           WHERE user_email = $1
           ORDER BY created_at DESC`,
          [user],
        )

    return NextResponse.json({ sessions: result.rows.map(toSession) })
  } catch (error) {
    console.error('GET /api/sessions failed', error)
    return NextResponse.json({ error: 'Could not load sessions.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { name, durationMs } = (payload ?? {}) as { name?: unknown; durationMs?: unknown }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: '`name` is required.' }, { status: 400 })
  }
  if (name.trim().length > 200) {
    return NextResponse.json({ error: '`name` must be 200 characters or fewer.' }, { status: 400 })
  }
  if (durationMs !== null && durationMs !== undefined) {
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
      return NextResponse.json(
        { error: '`durationMs` must be a positive number or null.' },
        { status: 400 },
      )
    }
  }

  try {
    await ensureSchema()
    const result = await pool.query<SessionRow>(
      `INSERT INTO timer_sessions (user_email, name, duration_ms)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user, name.trim(), durationMs ? Math.round(durationMs) : null],
    )
    return NextResponse.json({ session: toSession(result.rows[0]) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/sessions failed', error)
    return NextResponse.json({ error: 'Could not create the session.' }, { status: 500 })
  }
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  try {
    await ensureSchema()
    await pool.query(`DELETE FROM timer_sessions WHERE user_email = $1`, [user])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/sessions failed', error)
    return NextResponse.json({ error: 'Could not clear sessions.' }, { status: 500 })
  }
}
