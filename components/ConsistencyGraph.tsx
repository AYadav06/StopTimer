'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HEATMAP_CELL,
  HEATMAP_GAP,
  HEATMAP_STEP,
  buildHeatmap,
} from '@/lib/heatmap'
import { formatDayLabel, formatTime, localTimeZone, type DaySummary } from '@/lib/types'

interface ConsistencyGraphProps {
  days: DaySummary[]
  selectedDay: string | null
  onSelectDay: (day: string) => void
}

const LEVELS = [0, 1, 2, 3, 4] as const

function Flame() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  )
}

export function ConsistencyGraph({ days, selectedDay, onSelectDay }: ConsistencyGraphProps) {
  const [mounted, setMounted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  const data = useMemo(() => {
    if (!mounted) return null
    return buildHeatmap(days, localTimeZone())
  }, [days, mounted])

  // Start at the most recent weeks, like GitHub does.
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollLeft = node.scrollWidth
  }, [mounted])

  if (!data) {
    return (
      <section className="panel consistency" aria-label="Consistency">
        <div className="consistency-head">
          <div>
            <h2>Consistency</h2>
            <p>Loading your calendar...</p>
          </div>
        </div>
        <div className="heatmap-skeleton" aria-hidden="true" />
      </section>
    )
  }

  const width = data.weeks.length * HEATMAP_STEP

  return (
    <section className="panel consistency" aria-labelledby="consistency-title">
      <div className="consistency-head">
        <div>
          <h2 id="consistency-title">Consistency</h2>
          <p>
            {data.activeDays} active {data.activeDays === 1 ? 'day' : 'days'} &middot;{' '}
            {formatTime(data.totalMs)} tracked in the last year
          </p>
        </div>
        <div className="streak-badges">
          <span className="streak current">
            <Flame />
            {data.current} day{data.current === 1 ? '' : 's'}
          </span>
          <span className="streak best">Best {data.best}</span>
        </div>
      </div>

      <div className="heatmap-scroll" ref={scrollRef}>
        <div className="heatmap-months" style={{ width }}>
          {data.weeks.map((week, index) =>
            week.monthLabel ? (
              <span key={`${week.cells[0].date}-${index}`} style={{ left: index * HEATMAP_STEP }}>
                {week.monthLabel}
              </span>
            ) : null,
          )}
        </div>

        <div className="heatmap-body">
          <div className="heatmap-weekdays" aria-hidden="true">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>

          <div
            className="heatmap-grid"
            style={{
              gridTemplateColumns: `repeat(${data.weeks.length}, ${HEATMAP_CELL}px)`,
              gap: HEATMAP_GAP,
            }}
            role="group"
            aria-label="Daily activity over the last year"
          >
            {data.weeks.flatMap((week) =>
              week.cells.map((cell) => {
                const label = cell.count
                  ? `${formatDayLabel(cell.date)}: ${formatTime(cell.totalMs)}, ${cell.count} ${
                      cell.count === 1 ? 'session' : 'sessions'
                    }`
                  : `${formatDayLabel(cell.date)}: no sessions`
                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={`heatmap-cell level-${cell.level} ${
                      selectedDay === cell.date ? 'selected' : ''
                    } ${cell.inRange ? '' : 'out'}`}
                    disabled={!cell.inRange || cell.count === 0}
                    title={label}
                    aria-label={label}
                    aria-pressed={selectedDay === cell.date}
                    onClick={() => onSelectDay(cell.date)}
                  />
                )
              }),
            )}
          </div>
        </div>
      </div>

      <div className="heatmap-legend">
        <span>{data.today ? 'Today' : ''}</span>
        <div>
          <span>Less</span>
          {LEVELS.map((level) => (
            <i key={level} className={`legend level-${level}`} aria-hidden="true" />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  )
}
