import type { QueryResultRow } from 'pg'
import type { Session, SessionStatus } from './types'

export * from './types'

export interface SessionRow extends QueryResultRow {
  id: string
  name: string
  duration_ms: string | number | null
  elapsed_ms: string | number
  started_at: Date | string | null
  status: SessionStatus
  created_at: Date | string
}

/**
 * Total tracked milliseconds including an in-progress run, capped at the target
 * duration for countdown sessions. Mirrors `getElapsed` on the client.
 */
export const LIVE_ELAPSED_SQL = `
  LEAST(
    elapsed_ms + CASE
      WHEN status = 'running' AND started_at IS NOT NULL
        THEN round(extract(epoch FROM (now() - started_at)) * 1000)::bigint
      ELSE 0
    END,
    COALESCE(duration_ms, 9223372036854775807)
  )
`

function toNumber(value: string | number | null): number | null {
  if (value === null) return null
  return typeof value === 'number' ? value : Number(value)
}

export function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    duration: toNumber(row.duration_ms),
    elapsed: toNumber(row.elapsed_ms) ?? 0,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(value: string | null): value is string {
  if (!value || !DATE_RE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function isValidTimeZone(value: string | null): value is string {
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}
