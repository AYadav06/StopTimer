import { useCallback, useEffect, useState } from 'react'

export type SessionStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed'

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
  createdAt: number
}

const STORAGE_KEY = 'timer-dashboard:sessions'

function load(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session[]) : []
  } catch {
    return []
  }
}

/** Total elapsed time, including the in-progress run. */
export function getElapsed(s: Session, now = Date.now()): number {
  const live = s.elapsed + (s.startedAt ? now - s.startedAt : 0)
  return s.duration !== null ? Math.min(live, s.duration) : live
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(load)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  // Keep state in sync if the app is open in another tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSessions(load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const anyRunning = sessions.some((s) => s.status === 'running')

  // Tick only while something is running, marking countdowns completed once they finish.
  useEffect(() => {
    if (!anyRunning) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      setSessions((prev) => {
        const finished = (s: Session) =>
          s.status === 'running' && s.duration !== null && getElapsed(s, t) >= s.duration
        if (!prev.some(finished)) return prev
        return prev.map((s) =>
          finished(s) ? { ...s, elapsed: s.duration!, startedAt: null, status: 'completed' } : s,
        )
      })
    }, 250)
    return () => clearInterval(id)
  }, [anyRunning])

  const update = useCallback((id: string, fn: (s: Session) => Session) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? fn(s) : s)))
  }, [])

  const create = useCallback((name: string, duration: number | null) => {
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      duration,
      elapsed: 0,
      startedAt: null,
      status: 'idle',
      createdAt: Date.now(),
    }
    setSessions((prev) => [session, ...prev])
  }, [])

  const start = useCallback(
    (id: string) =>
      update(id, (s) =>
        s.status === 'running' || s.status === 'completed'
          ? s
          : { ...s, startedAt: Date.now(), status: 'running' },
      ),
    [update],
  )

  const pause = useCallback(
    (id: string) =>
      update(id, (s) =>
        s.status !== 'running'
          ? s
          : { ...s, elapsed: getElapsed(s), startedAt: null, status: 'paused' },
      ),
    [update],
  )

  const stop = useCallback(
    (id: string) =>
      update(id, (s) => ({ ...s, elapsed: getElapsed(s), startedAt: null, status: 'stopped' })),
    [update],
  )

  const reset = useCallback(
    (id: string) => update(id, (s) => ({ ...s, elapsed: 0, startedAt: null, status: 'idle' })),
    [update],
  )

  const remove = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearAll = useCallback(() => setSessions([]), [])

  return { sessions, now, create, start, pause, stop, reset, remove, clearAll }
}
