export type SessionStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed'

export const SESSION_STATUSES: readonly SessionStatus[] = [
  'idle',
  'running',
  'paused',
  'stopped',
  'completed',
]

export interface Session {
  id: string
  name: string
  /** Target duration in ms for a countdown; null means a count-up stopwatch. */
  duration: number | null
  /** Time accumulated before the current run, in ms. */
  elapsed: number
  /** Epoch ms when the current run started; null when not running. */
  startedAt: number | null
  status: SessionStatus
  /** Epoch ms when the session was created. */
  createdAt: number
}

export interface DaySummary {
  /** Calendar day in the user's time zone, formatted as YYYY-MM-DD. */
  date: string
  count: number
  totalMs: number
  running: number
}

/** Total elapsed time, including the in-progress run. */
export function getElapsed(session: Session, now = Date.now()): number {
  const live = session.elapsed + (session.startedAt ? now - session.startedAt : 0)
  return session.duration !== null ? Math.min(live, session.duration) : live
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** Human label for a YYYY-MM-DD day key, without time-zone drift. */
export function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
