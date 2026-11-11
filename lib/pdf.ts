import { formatTime, getElapsed, type Session } from './types'
import { dayKeyFromEpoch, todayKey } from './heatmap'

type JsPdf = import('jspdf').jsPDF
type JsPdfWithTable = JsPdf & { lastAutoTable?: { finalY: number } }

export interface ExportPdfOptions {
  sessions: Session[]
  tz: string
  /** When set, only this local day is exported. */
  selectedDay: string | null
}

const PAGE_MARGIN = 40
const ACCENT: [number, number, number] = [31, 111, 229]
const INK: [number, number, number] = [28, 34, 46]
const MUTED: [number, number, number] = [110, 120, 136]

function localDayLabel(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function localTime(epoch: number, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(epoch))
}

function localDate(epoch: number, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epoch))
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export async function downloadSessionHistoryPdf({
  sessions,
  tz,
  selectedDay,
}: ExportPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as JsPdfWithTable
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PAGE_MARGIN * 2
  const now = Date.now()

  const groups = new Map<string, Session[]>()
  for (const session of sessions) {
    const key = dayKeyFromEpoch(session.createdAt, tz)
    const bucket = groups.get(key)
    if (bucket) bucket.push(session)
    else groups.set(key, [session])
  }
  const dayKeys = [...groups.keys()].sort().reverse()
  const totalMs = sessions.reduce((sum, session) => sum + getElapsed(session, now), 0)

  doc.setProperties({
    title: selectedDay ? `Session history ${selectedDay}` : 'Session history',
    subject: 'Timer Dashboard session history',
    author: 'Timer Dashboard',
    creator: 'Timer Dashboard',
  })

  // Header band
  doc.setFillColor(9, 11, 16)
  doc.rect(0, 0, pageWidth, 118, 'F')
  doc.setFillColor(...ACCENT)
  doc.rect(0, 112, pageWidth, 6, 'F')

  doc.setTextColor(150, 165, 190)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('TIMER DASHBOARD', PAGE_MARGIN, 40, { charSpace: 2 })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('Session History', PAGE_MARGIN, 70)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(178, 190, 210)
  const scope = selectedDay ? localDayLabel(selectedDay) : 'All days'
  doc.text(scope, PAGE_MARGIN, 90)
  doc.text(`Generated ${localDate(now, tz)} at ${localTime(now, tz)}`, PAGE_MARGIN, 104)

  // Summary cards
  const cardY = 142
  const cardGap = 12
  const cardWidth = (contentWidth - cardGap * 2) / 3
  const cards: Array<[string, string]> = [
    ['Days tracked', String(dayKeys.length)],
    ['Sessions', String(sessions.length)],
    ['Total tracked', formatTime(totalMs)],
  ]
  cards.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + index * (cardWidth + cardGap)
    doc.setFillColor(244, 247, 252)
    doc.setDrawColor(224, 230, 240)
    doc.setLineWidth(0.8)
    doc.roundedRect(x, cardY, cardWidth, 58, 6, 6, 'FD')
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(label.toUpperCase(), x + 12, cardY + 20, { charSpace: 0.6 })
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(value, x + 12, cardY + 44)
  })

  let y = cardY + 88

  for (const day of dayKeys) {
    const daySessions = [...groups.get(day)!].sort((a, b) => a.createdAt - b.createdAt)
    const dayTotal = daySessions.reduce((sum, session) => sum + getElapsed(session, now), 0)

    if (y > pageHeight - 140) {
      doc.addPage()
      y = 60
    }

    doc.setFillColor(...ACCENT)
    doc.rect(PAGE_MARGIN, y - 11, 3.5, 16, 'F')
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(`${localDayLabel(day)}${day === todayKey(tz) ? '  (today)' : ''}`, PAGE_MARGIN + 12, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...MUTED)
    doc.text(
      `${daySessions.length} ${daySessions.length === 1 ? 'session' : 'sessions'}  -  ${formatTime(dayTotal)}`,
      pageWidth - PAGE_MARGIN,
      y,
      { align: 'right' },
    )

    const rows = daySessions.map((session) => [
      session.name,
      capitalize(session.status),
      session.duration === null ? 'Stopwatch' : `Countdown ${formatTime(session.duration)}`,
      formatTime(getElapsed(session, now)),
      localTime(session.createdAt, tz),
    ])

    autoTable(doc, {
      startY: y + 12,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Session', 'Status', 'Type', 'Elapsed', 'Started']],
      body: rows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor: INK,
        lineColor: [226, 232, 241],
        lineWidth: 0.5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: ACCENT,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      columnStyles: {
        0: { cellWidth: 195 },
        1: { cellWidth: 55 },
        2: { cellWidth: 115 },
        3: { cellWidth: 62 },
        4: { cellWidth: 'auto' },
      },
    })

    y = (doc.lastAutoTable?.finalY ?? y) + 26
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140, 150, 166)
    doc.text('Timer Dashboard - Session history', PAGE_MARGIN, pageHeight - 22)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 22, {
      align: 'right',
    })
  }

  const filename = selectedDay
    ? `timer-history-${selectedDay}.pdf`
    : `timer-history-${todayKey(tz)}.pdf`
  doc.save(filename)
}

