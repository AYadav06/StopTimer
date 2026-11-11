'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
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
  const title = message ?? `Export daily history (${scope})`

  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/60 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      onClick={() => void handleExport()}
      disabled={busy || sessions.length === 0}
      title={title}
      aria-label={title}
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  )
}
