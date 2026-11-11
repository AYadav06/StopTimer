import { NextResponse, type NextRequest } from 'next/server'
import { ensureSchema, pool } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { LIVE_ELAPSED_SQL, isValidTimeZone } from '@/lib/sessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DayRow {
  date: string
  count: number
  total_ms: string
  running: number
}

/** One entry per calendar day that has sessions, newest first. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const tz = request.nextUrl.searchParams.get('tz') ?? 'UTC'
  if (!isValidTimeZone(tz)) {
    return NextResponse.json({ error: '`tz` must be a valid IANA time zone.' }, { status: 400 })
  }

  try {
    await ensureSchema()
    const result = await pool.query<DayRow>(
      `SELECT (created_at AT TIME ZONE $2)::date::text AS date,
              count(*)::int AS count,
              COALESCE(sum(${LIVE_ELAPSED_SQL}), 0)::bigint AS total_ms,
              count(*) FILTER (WHERE status = 'running')::int AS running
       FROM timer_sessions
       WHERE user_email = $1
       GROUP BY 1
       ORDER BY 1 DESC`,
      [user, tz],
    )

    return NextResponse.json({
      days: result.rows.map((row) => ({
        date: row.date,
        count: row.count,
        totalMs: Number(row.total_ms),
        running: row.running,
      })),
    })
  } catch (error) {
    console.error('GET /api/days failed', error)
    return NextResponse.json({ error: 'Could not load session days.' }, { status: 500 })
  }
}
