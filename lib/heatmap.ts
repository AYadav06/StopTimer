import type { DaySummary } from './types'

export type Level = 0 | 1 | 2 | 3 | 4

export interface HeatmapCell {
  /** Local calendar day `YYYY-MM-DD`. */
  date: string
  count: number
  totalMs: number
  level: Level
  /** False for days after today that fill out the last week column. */
  inRange: boolean
}

export interface HeatmapWeek {
  cells: HeatmapCell[]
  monthLabel: string | null
}

export interface HeatmapData {
  weeks: HeatmapWeek[]
  activeDays: number
  totalMs: number
  current: number
  best: number
  today: string
}

export const HEATMAP_CELL = 12
export const HEATMAP_GAP = 3
export const HEATMAP_STEP = HEATMAP_CELL + HEATMAP_GAP

export function dayKeyFromEpoch(epoch: number, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epoch))
}

export function todayKey(tz: string): string {
  return dayKeyFromEpoch(Date.now(), tz)
}

export function addDaysKey(key: string, delta: number): string {
  const date = new Date(`${key}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

/** 0 = Sunday, matching the GitHub calendar columns. */
export function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay()
}

export function levelFor(totalMs: number): Level {
  if (totalMs <= 0) return 0
  if (totalMs < 15 * 60_000) return 1
  if (totalMs < 45 * 60_000) return 2
  if (totalMs < 90 * 60_000) return 3
  return 4
}

function monthShort(key: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00Z`))
}

function dayOfMonth(key: string): number {
  return Number(key.slice(8, 10))
}

export function computeStreaks(days: DaySummary[], tz: string): { current: number; best: number } {
  const active = days
    .filter((day) => day.totalMs > 0)
    .map((day) => day.date)
    .sort()
  const activeSet = new Set(active)

  let best = 0
  let run = 0
  let previous: string | null = null
  for (const date of active) {
    run = previous && addDaysKey(previous, 1) === date ? run + 1 : 1
    best = Math.max(best, run)
    previous = date
  }

  // A streak survives until the end of the day after the last active day, so a
  // quiet morning does not break it.
  let cursor = todayKey(tz)
  if (!activeSet.has(cursor)) cursor = addDaysKey(cursor, -1)
  let current = 0
  while (activeSet.has(cursor)) {
    current += 1
    cursor = addDaysKey(cursor, -1)
  }

  return { current, best }
}

export function buildHeatmap(days: DaySummary[], tz: string, weekCount = 53): HeatmapData {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const today = todayKey(tz)
  const endSunday = addDaysKey(today, -weekdayOf(today))
  const startSunday = addDaysKey(endSunday, -(weekCount - 1) * 7)

  const weeks: HeatmapWeek[] = []
  for (let week = 0; week < weekCount; week += 1) {
    const cells: HeatmapCell[] = []
    for (let day = 0; day < 7; day += 1) {
      const date = addDaysKey(startSunday, week * 7 + day)
      const summary = byDate.get(date)
      const totalMs = summary?.totalMs ?? 0
      cells.push({
        date,
        count: summary?.count ?? 0,
        totalMs,
        level: levelFor(totalMs),
        inRange: date <= today,
      })
    }

    const firstOfMonth = cells.find((cell) => dayOfMonth(cell.date) === 1)
    const monthLabel = week === 0 ? monthShort(cells[0].date) : firstOfMonth ? monthShort(firstOfMonth.date) : null
    weeks.push({ cells, monthLabel })
  }

  const active = days.filter((day) => day.totalMs > 0)
  const { current, best } = computeStreaks(days, tz)

  return {
    weeks,
    activeDays: active.length,
    totalMs: active.reduce((sum, day) => sum + day.totalMs, 0),
    current,
    best,
    today,
  }
}

