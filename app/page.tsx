'use client'

import { useState, type FormEvent } from 'react'
import { formatDayLabel, formatTime, getElapsed, type Session } from '@/lib/types'
import { useSessions } from '@/lib/useSessions'

function App() {
  const {
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
  } = useSessions()
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const mins = parseFloat(minutes)
    void create(trimmed, mins > 0 ? Math.round(mins * 60_000) : null)
    setName('')
    setMinutes('')
  }

  const totalTracked = sessions.reduce((sum, session) => sum + getElapsed(session, now), 0)
  const runningCount = sessions.filter((session) => session.status === 'running').length
  const completedCount = sessions.filter((session) => session.status === 'completed').length
  const allDaysTotal = days.reduce((sum, day) => sum + day.totalMs, 0)

  return (
    <main className="dashboard">
      <header>
        <h1>Timer Dashboard</h1>
        <p className="subtitle">Sessions are saved in Postgres on Neon.</p>
      </header>

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <section className="stats">
        <Stat label="Sessions" value={String(sessions.length)} />
        <Stat label="Running" value={String(runningCount)} />
        <Stat label="Completed" value={String(completedCount)} />
        <Stat label="Total tracked" value={formatTime(totalTracked)} />
      </section>

      <section className="days" aria-label="Filter by day">
        <div className="days-head">
          <h2>Days</h2>
          <span className="days-hint">
            {selectedDay ? `Showing ${formatDayLabel(selectedDay)}` : 'Showing every day'}
          </span>
        </div>
        <div className="day-list">
          <button
            type="button"
            className={`day ${selectedDay === null ? 'active' : ''}`}
            onClick={() => setSelectedDay(null)}
          >
            <span className="day-label">All days</span>
            <span className="day-total">{formatTime(allDaysTotal)}</span>
            <span className="day-count">{days.reduce((sum, day) => sum + day.count, 0)} sessions</span>
          </button>
          {days.map((day) => (
            <button
              type="button"
              key={day.date}
              className={`day ${selectedDay === day.date ? 'active' : ''}`}
              onClick={() => setSelectedDay(day.date)}
            >
              <span className="day-label">{formatDayLabel(day.date)}</span>
              <span className="day-total">{formatTime(day.totalMs)}</span>
              <span className="day-count">
                {day.count} {day.count === 1 ? 'session' : 'sessions'}
                {day.running > 0 ? ' · running' : ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      <form className="create" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Session name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          required
        />
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Minutes (blank = stopwatch)"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
        />
        <button type="submit" className="primary">
          Create session
        </button>
      </form>

      {loading ? (
        <p className="empty">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="empty">
          {selectedDay
            ? `No sessions on ${formatDayLabel(selectedDay)}.`
            : 'No sessions yet. Create one above.'}
        </p>
      ) : (
        <>
          <ul className="sessions">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                now={now}
                onStart={() => void start(session.id)}
                onPause={() => void pause(session.id)}
                onStop={() => void stop(session.id)}
                onReset={() => void reset(session.id)}
                onRename={(next) => void rename(session.id, next)}
                onDelete={() => void remove(session.id)}
              />
            ))}
          </ul>
          <button
            className="danger clear"
            onClick={() => confirm('Delete all sessions?') && void clearAll()}
          >
            Clear all sessions
          </button>
        </>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

interface SessionCardProps {
  session: Session
  now: number
  onStart: () => void
  onPause: () => void
  onStop: () => void
  onReset: () => void
  onRename: (name: string) => void
  onDelete: () => void
}

function SessionCard({
  session,
  now,
  onStart,
  onPause,
  onStop,
  onReset,
  onRename,
  onDelete,
}: SessionCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(session.name)

  const elapsed = getElapsed(session, now)
  const isCountdown = session.duration !== null
  const display = isCountdown ? session.duration! - elapsed : elapsed
  const progress = isCountdown ? (elapsed / session.duration!) * 100 : null
  const { status } = session

  const submitRename = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== session.name) onRename(trimmed)
    setEditing(false)
  }

  return (
    <li className={`session ${status}`}>
      <div className="session-head">
        {editing ? (
          <form
            className="rename"
            onSubmit={(event) => {
              event.preventDefault()
              submitRename()
            }}
          >
            <input
              type="text"
              value={draft}
              autoFocus
              maxLength={200}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={submitRename}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setDraft(session.name)
                  setEditing(false)
                }
              }}
              aria-label="Session name"
            />
          </form>
        ) : (
          <h2 title={session.name}>{session.name}</h2>
        )}
        <span className={`badge ${status}`}>{status}</span>
      </div>

      <div className="time">{formatTime(display)}</div>
      <div className="meta">
        {isCountdown
          ? `Countdown · ${formatTime(session.duration!)} · ${formatTime(elapsed)} elapsed`
          : 'Stopwatch'}
      </div>

      {progress !== null && (
        <div className="progress">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="actions">
        {status === 'running' ? (
          <button onClick={onPause}>Pause</button>
        ) : (
          <button className="primary" onClick={onStart} disabled={status === 'completed'}>
            {status === 'idle' ? 'Start' : 'Resume'}
          </button>
        )}
        <button onClick={onStop} disabled={status === 'idle' || status === 'stopped' || status === 'completed'}>
          Stop
        </button>
        <button onClick={onReset} disabled={status === 'idle'}>
          Reset
        </button>
        <button
          onClick={() => {
            setDraft(session.name)
            setEditing(true)
          }}
        >
          Rename
        </button>
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  )
}

export default App
