'use client'

import { useState, type FormEvent } from 'react'
import { ConsistencyGraph } from '@/components/ConsistencyGraph'
import { ExportPdfButton } from '@/components/ExportPdfButton'
import { SessionCard } from '@/components/SessionCard'
import { AuthButton } from '@/components/AuthButton'
import { formatDayLabel, formatTime, getElapsed } from '@/lib/types'
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
  const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const mins = parseFloat(minutes)
    const duration = mode === 'countdown' && mins > 0 ? Math.round(mins * 60_000) : null
    if (mode === 'countdown' && duration === null) return
    void create(trimmed, duration)
    setName('')
    setMinutes('')
  }

  const totalTracked = sessions.reduce((sum, session) => sum + getElapsed(session, now), 0)
  const runningCount = sessions.filter((session) => session.status === 'running').length
  const completedCount = sessions.filter((session) => session.status === 'completed').length
  const allDaysTotal = days.reduce((sum, day) => sum + day.totalMs, 0)
  const allSessionsCount = days.reduce((sum, day) => sum + day.count, 0)

  return (
    <main className="dashboard">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <strong>Timer</strong>
          </div>
        </div>
        <div className="topbar-right">
          <ExportPdfButton sessions={sessions} selectedDay={selectedDay} />
          <AuthButton />
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Daily log + session timers at the top */}
      <div className="workspace">
        <section className="panel sessions-panel" aria-labelledby="sessions-title">
          <div className="panel-head">
            <div>
              <h2 id="sessions-title">
                {selectedDay ? formatDayLabel(selectedDay) : 'All sessions'}
              </h2>
              <p>
                {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} ·{' '}
                {formatTime(totalTracked)} tracked
              </p>
            </div>
            <button
              type="button"
              className="button ghost small"
              onClick={() => setSelectedDay(null)}
              disabled={selectedDay === null}
            >
              Show all
            </button>
          </div>

          <div id="new-session" className="create-wrap">
            <div className="mode-toggle" role="group" aria-label="Timer type">
              <button
                type="button"
                className={mode === 'stopwatch' ? 'active' : ''}
                aria-pressed={mode === 'stopwatch'}
                onClick={() => setMode('stopwatch')}
              >
                Stopwatch
              </button>
              <button
                type="button"
                className={mode === 'countdown' ? 'active' : ''}
                aria-pressed={mode === 'countdown'}
                onClick={() => setMode('countdown')}
              >
                Countdown
              </button>
            </div>

            <form className="create" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="What are you working on?"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                aria-label="Session name"
                required
              />
              {mode === 'countdown' && (
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Minutes"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  aria-label="Minutes"
                  required
                />
              )}
              <button type="submit" className="button primary">
                Create
              </button>
            </form>
          </div>

          {loading ? (
            <p className="empty">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="empty">
              {selectedDay
                ? `Nothing logged on ${formatDayLabel(selectedDay)} yet.`
                : 'No sessions yet. Create one above and start the clock.'}
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
                type="button"
                className="button danger clear"
                onClick={() => {
                  if (confirm('Delete every session? This cannot be undone.')) void clearAll()
                }}
              >
                Clear all sessions
              </button>
            </>
          )}
        </section>

        <aside className="panel days-panel" aria-labelledby="days-title">
          <div className="panel-head">
            <div>
              <h2 id="days-title">Daily log</h2>
              <p>
                {days.length} {days.length === 1 ? 'day' : 'days'} ·{' '}
                {formatTime(allDaysTotal)}
              </p>
            </div>
          </div>

          <div className="day-list">
            <button
              type="button"
              className={`day ${selectedDay === null ? 'active' : ''}`}
              onClick={() => setSelectedDay(null)}
            >
              <span className="day-label">All days</span>
              <span className="day-total">{formatTime(allDaysTotal)}</span>
              <span className="day-count">{allSessionsCount} sessions</span>
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
            {days.length === 0 && !loading && (
              <p className="empty small">No tracked days yet.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Stats */}
      <section className="stats" aria-label="Overview">
        <Stat label="Sessions shown" value={String(sessions.length)} accent />
        <Stat label="Running now" value={String(runningCount)} />
        <Stat label="Completed" value={String(completedCount)} />
        <Stat label="Tracked here" value={formatTime(totalTracked)} />
      </section>

      {/* Consistency chart */}
      <ConsistencyGraph days={days} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      <footer className="footer">
        <p>
          Sessions are stored in Postgres on Neon. Export a PDF any time — one row per session,
          grouped by day.
        </p>
      </footer>
    </main>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default App
