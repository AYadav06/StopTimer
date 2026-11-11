import { NextResponse, type NextRequest } from 'next/server'
import { ensureSchema, pool } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { toSession, type SessionRow } from '@/lib/sessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Action = 'start' | 'pause' | 'stop' | 'reset' | 'complete' | 'rename'
const ACTIONS: readonly Action[] = ['start', 'pause', 'stop', 'reset', 'complete', 'rename']

interface RouteContext {
  params: Promise<{ id: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const { action, name } = (payload ?? {}) as { action?: unknown; name?: unknown }
  if (typeof action !== 'string' || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }
  if (action === 'rename') {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '`name` is required to rename.' }, { status: 400 })
    }
    if (name.trim().length > 200) {
      return NextResponse.json(
        { error: '`name` must be 200 characters or fewer.' },
        { status: 400 },
      )
    }
  }

  try {
    await ensureSchema()
    const result = await pool.query<SessionRow>(SQL_BY_ACTION[action as Action], [
      id,
      ...(action === 'rename' ? [name as string] : []),
      user,
    ])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }
    return NextResponse.json({ session: toSession(result.rows[0]) })
  } catch (error) {
    console.error(`PATCH /api/sessions/${id} failed`, error)
    return NextResponse.json({ error: 'Could not update the session.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 })
  }

  try {
    await ensureSchema()
    const result = await pool.query(`DELETE FROM timer_sessions WHERE id = $1 AND user_email = $2`, [id, user])
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`DELETE /api/sessions/${id} failed`, error)
    return NextResponse.json({ error: 'Could not delete the session.' }, { status: 500 })
  }
}

const SQL_BY_ACTION: Record<Action, string> = {
  // Keep a single row as the source of truth: the database stamps the clock, so
  // every device that talks to the API accumulates the same elapsed time.
  start: `
    UPDATE timer_sessions
    SET status = 'running',
        started_at = COALESCE(started_at, now()),
        updated_at = now()
    WHERE id = $1 AND user_email = $2 AND status IN ('idle', 'paused', 'stopped', 'running')
    RETURNING *`,
  pause: `
    UPDATE timer_sessions
    SET elapsed_ms = LEAST(
          elapsed_ms + CASE
            WHEN status = 'running' AND started_at IS NOT NULL
              THEN round(extract(epoch FROM (now() - started_at)) * 1000)::bigint
            ELSE 0
          END,
          COALESCE(duration_ms, 9223372036854775807)
        ),
        started_at = NULL,
        status = 'paused',
        updated_at = now()
    WHERE id = $1 AND user_email = $2 AND status IN ('running', 'paused')
    RETURNING *`,
  stop: `
    UPDATE timer_sessions
    SET elapsed_ms = LEAST(
          elapsed_ms + CASE
            WHEN status = 'running' AND started_at IS NOT NULL
              THEN round(extract(epoch FROM (now() - started_at)) * 1000)::bigint
            ELSE 0
          END,
          COALESCE(duration_ms, 9223372036854775807)
        ),
        started_at = NULL,
        status = 'stopped',
        updated_at = now()
    WHERE id = $1 AND user_email = $2 AND status IN ('running', 'paused', 'stopped')
    RETURNING *`,
  reset: `
    UPDATE timer_sessions
    SET elapsed_ms = 0,
        started_at = NULL,
        status = 'idle',
        updated_at = now()
    WHERE id = $1 AND user_email = $2
    RETURNING *`,
  complete: `
    UPDATE timer_sessions
    SET elapsed_ms = COALESCE(duration_ms, elapsed_ms),
        started_at = NULL,
        status = 'completed',
        updated_at = now()
    WHERE id = $1 AND user_email = $2 AND status IN ('running', 'completed')
    RETURNING *`,
  rename: `
    UPDATE timer_sessions
    SET name = $2,
        updated_at = now()
    WHERE id = $1 AND user_email = $3
    RETURNING *`,
}

