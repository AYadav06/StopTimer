'use client'

import { useState } from 'react'
import { formatTime, getElapsed, type Session } from '@/lib/types'

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

const STATUS_LABEL: Record<Session['status'], string> = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
  stopped: 'Stopped',
  completed: 'Completed',
}

export function SessionCard({
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
  const progress = isCountdown ? Math.min(100, (elapsed / session.duration!) * 100) : null
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
          <h3 title={session.name}>{session.name}</h3>
        )}
        <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="time">
        {isCountdown && display === 0 ? 'Time is up' : formatTime(display)}
      </div>

      <div className="meta">
        {isCountdown
          ? `Countdown · ${formatTime(session.duration!)} · ${formatTime(elapsed)} elapsed`
          : 'Stopwatch · counts up'}
      </div>

      {progress !== null && (
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Countdown progress"
        >
          <div style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="actions">
        {status === 'running' ? (
          <button type="button" className="pause" onClick={onPause}>
            Pause
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={onStart}
            disabled={status === 'completed'}
          >
            {status === 'idle' ? 'Start' : 'Resume'}
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          disabled={status === 'idle' || status === 'stopped' || status === 'completed'}
        >
          Stop
        </button>
        <button type="button" onClick={onReset} disabled={status === 'idle'}>
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(session.name)
            setEditing(true)
          }}
        >
          Rename
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  )
}
