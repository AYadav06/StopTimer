'use client'

import { useState } from 'react'
import { formatDayLabel, localTimeZone, type Session } from '@/lib/types'

interface ExportPdfButtonProps {
  sessions: Session[]
  selectedDay: string | null
}

export function ExportPdfButton({ sessions, selectedDay }: ExportPdfButtonProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleExport = async () => {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      // Loaded on click so jsPDF never lands in the initial bundle.
      const { downloadSessionHistoryPdf } = await import('@/lib/pdf')
      await downloadSessionHistoryPdf({
        sessions,
        tz: localTimeZone(),
        selectedDay,
      })
      setMessage('PDF saved to your downloads.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not build the PDF.')
    } finally {
      setBusy(false)
    }
  }

  const scope = selectedDay ? formatDayLabel(selectedDay) : 'all days'

  return (
    <div className="export">
      <button
        type="button"
        className="button export-button"
        onClick={() => void handleExport()}
        disabled={busy || sessions.length === 0}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path
            d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {busy ? 'Building PDF…' : 'Export PDF'}
      </button>
      <span className="export-hint" role="status">
        {message ?? `Daily history for ${scope}`}
      </span>
    </div>
  )
}
