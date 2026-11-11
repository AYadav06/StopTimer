'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getElapsed,
  localTimeZone,
  type DaySummary,
  type Session,
} from './types'

interface SessionsResponse {
  sessions: Session[]
}

interface SessionResponse {
  session: Session
}

interface DaysResponse {
  days: DaySummary[]
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  const data = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}.`)
  }
  return data as T
}

function timeZone(): string {
  return localTimeZone()
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [days, setDays] = useState<DaySummary[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const completing = useRef(new Set<string>())

  const refreshDays = useCallback(async () => {
    try {
      const data = await request<DaysResponse>(
        `/api/days?tz=${encodeURIComponent(timeZone())}`,
      )
      setDays(data.days)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load day totals.')
    }
  }, [])

  const refreshSessions = useCallback(async () => {
    try {
      const query = selectedDay
        ? `?date=${encodeURIComponent(selectedDay)}&tz=${encodeURIComponent(timeZone())}`
        : `?tz=${encodeURIComponent(timeZone())}`
      const data = await request<SessionsResponse>(`/api/sessions${query}`)
      setSessions(data.sessions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sessions.')
    }
  }, [selectedDay])

  useEffect(() => {
    let active = true
    setLoading(true)
    void (async () => {
      await Promise.all([refreshSessions(), refreshDays()])
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [refreshSessions, refreshDays])

  const anyRunning = sessions.some((session) => session.status === 'running')

  // Tick only while something is running.
  useEffect(() => {
    if (!anyRunning) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [anyRunning])

  const applySession = useCallback((updated: Session) => {
    setSessions((prev) => prev.map((session) => (session.id === updated.id ? updated : session)))
  }, [])

  const mutate = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        const data = await request<SessionResponse>(`/api/sessions/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        applySession(data.session)
        setError(null)
        void refreshDays()
        // A renamed or reset session can change which day it belongs to only via
        // created_at, which never moves, so the list itself stays valid.
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update the session.')
        void refreshSessions()
      }
    },
    [applySession, refreshDays, refreshSessions],
  )

  // Auto-complete countdowns the moment they hit zero.
  useEffect(() => {
    if (!anyRunning) return
    for (const session of sessions) {
      const finished =
        session.status === 'running' &&
        session.duration !== null &&
        getElapsed(session, now) >= session.duration
      if (!finished || completing.current.has(session.id)) continue
      completing.current.add(session.id)
      void mutate(session.id, { action: 'complete' }).finally(() => {
        completing.current.delete(session.id)
      })
    }
  }, [sessions, now, anyRunning, mutate])

  const create = useCallback(
    async (name: string, durationMs: number | null) => {
      try {
        await request<SessionResponse>('/api/sessions', {
          method: 'POST',
          body: JSON.stringify({ name, durationMs }),
        })
        setError(null)
        await refreshSessions()
        void refreshDays()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the session.')
      }
    },
    [refreshSessions, refreshDays],
  )

  const start = useCallback((id: string) => mutate(id, { action: 'start' }), [mutate])
  const pause = useCallback((id: string) => mutate(id, { action: 'pause' }), [mutate])
  const stop = useCallback((id: string) => mutate(id, { action: 'stop' }), [mutate])
  const reset = useCallback((id: string) => mutate(id, { action: 'reset' }), [mutate])
  const rename = useCallback((id: string, name: string) => mutate(id, { action: 'rename', name }), [mutate])

  const remove = useCallback(
    async (id: string) => {
      try {
        await request<{ ok: true }>(`/api/sessions/${id}`, { method: 'DELETE' })
        setSessions((prev) => prev.filter((session) => session.id !== id))
        setError(null)
        void refreshDays()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete the session.')
      }
    },
    [refreshDays],
  )

  const clearAll = useCallback(async () => {
    try {
      await request<{ ok: true }>('/api/sessions', { method: 'DELETE' })
      setSessions([])
      setError(null)
      void refreshDays()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear sessions.')
    }
  }, [refreshDays])

  return {
    sessions,
    days,
    now,
    loading,
    error,
    selectedDay,
    setSelectedDay,
    create,
    start,
    pause,
    stop,
    reset,
    rename,
    remove,
    clearAll,
  }
}
