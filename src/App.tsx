import { useState, type FormEvent } from 'react'
import { getElapsed, useSessions, type Session } from './useSessions'
import './App.css'

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function App() {
  const { sessions, now, create, start, pause, stop, reset, remove, clearAll } = useSessions()
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const mins = parseFloat(minutes)
    create(trimmed, mins > 0 ? Math.round(mins * 60_000) : null)
    setName('')
    setMinutes('')
  }

  const totalTracked = sessions.reduce((sum, s) => sum + getElapsed(s, now), 0)
  const runningCount = sessions.filter((s) => s.status === 'running').length
  const completedCount = sessions.filter((s) => s.status === 'completed').length

  return (
    <main className="dashboard">
      <header>
        <h1>Timer Dashboard</h1>
        <p className="subtitle">Sessions are saved in your browser's localStorage.</p>
      </header>

      <section className="stats">
        <Stat label="Sessions" value={String(sessions.length)} />
        <Stat label="Running" value={String(runningCount)} />
        <Stat label="Completed" value={String(completedCount)} />
        <Stat label="Total tracked" value={formatTime(totalTracked)} />
      </section>

      <form className="create" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Session name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Minutes (blank = stopwatch)"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <button type="submit" className="primary">
          Create session
        </button>
      </form>

      {sessions.length === 0 ? (
        <p className="empty">No sessions yet. Create one above.</p>
      ) : (
        <>
          <ul className="sessions">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                now={now}
                onStart={() => start(s.id)}
                onPause={() => pause(s.id)}
                onStop={() => stop(s.id)}
                onReset={() => reset(s.id)}
                onDelete={() => remove(s.id)}
              />
            ))}
          </ul>
          <button
            className="danger clear"
            onClick={() => confirm('Delete all sessions?') && clearAll()}
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
  onDelete: () => void
}

function SessionCard({ session, now, onStart, onPause, onStop, onReset, onDelete }: SessionCardProps) {
  const elapsed = getElapsed(session, now)
  const isCountdown = session.duration !== null
  const display = isCountdown ? session.duration! - elapsed : elapsed
  const progress = isCountdown ? (elapsed / session.duration!) * 100 : null
  const { status } = session

  return (
    <li className={`session ${status}`}>
      <div className="session-head">
        <h2>{session.name}</h2>
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
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  )
}

export default App
