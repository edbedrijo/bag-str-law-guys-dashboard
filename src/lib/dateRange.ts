export type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_30'
  | 'last_7'
  | 'this_quarter'
  | 'this_year'

export interface DateRange {
  start: { year: number; month: number; day: number }
  end:   { year: number; month: number; day: number }
  label: string
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function quarterStart(month: number): number {
  return Math.floor(month / 3) * 3
}

export function getDateRange(preset: DateRangePreset, today = new Date()): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  switch (preset) {
    case 'this_month':
      return { start: { year: y, month: m, day: 1 }, end: { year: y, month: m, day: d }, label: `${MONTHS[m]} ${y}` }

    case 'last_month': {
      const pm = m === 0 ? 11 : m - 1
      const py = m === 0 ? y - 1 : y
      return { start: { year: py, month: pm, day: 1 }, end: { year: py, month: pm, day: daysInMonth(py, pm) }, label: `${MONTHS[pm]} ${py}` }
    }

    case 'last_30': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return {
        start: { year: from.getFullYear(), month: from.getMonth(), day: from.getDate() },
        end:   { year: y, month: m, day: d },
        label: 'Last 30 days',
      }
    }

    case 'last_7': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return {
        start: { year: from.getFullYear(), month: from.getMonth(), day: from.getDate() },
        end:   { year: y, month: m, day: d },
        label: 'Last 7 days',
      }
    }

    case 'this_quarter': {
      const qs = quarterStart(m)
      return { start: { year: y, month: qs, day: 1 }, end: { year: y, month: m, day: d }, label: `Q${Math.floor(m / 3) + 1} ${y}` }
    }

    case 'this_year':
    default:
      return { start: { year: y, month: 0, day: 1 }, end: { year: y, month: m, day: d }, label: `Jan–${MONTHS[m]} ${y}` }
  }
}

export function getPriorRange(preset: DateRangePreset, today = new Date()): DateRange & { label: string } {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  switch (preset) {
    case 'this_month': {
      // Same days 1–d in prior month
      const pm = m === 0 ? 11 : m - 1
      const py = m === 0 ? y - 1 : y
      const endDay = Math.min(d, daysInMonth(py, pm))
      return { start: { year: py, month: pm, day: 1 }, end: { year: py, month: pm, day: endDay }, label: `vs ${MONTHS[pm]}` }
    }
    case 'last_month': {
      // Same period two months ago
      const pm = m <= 1 ? 10 + m : m - 2
      const py = m <= 1 ? y - 1 : y
      return { start: { year: py, month: pm, day: 1 }, end: { year: py, month: pm, day: daysInMonth(py, pm) }, label: `vs ${MONTHS[pm]}` }
    }
    case 'last_30':
    case 'last_7': {
      const days = preset === 'last_30' ? 30 : 7
      const toDate = new Date(today); toDate.setDate(toDate.getDate() - days)
      const fromDate = new Date(toDate); fromDate.setDate(fromDate.getDate() - days + 1)
      return {
        start: { year: fromDate.getFullYear(), month: fromDate.getMonth(), day: fromDate.getDate() },
        end:   { year: toDate.getFullYear(),   month: toDate.getMonth(),   day: toDate.getDate() },
        label: `vs prior ${days}d`,
      }
    }
    case 'this_quarter': {
      // Prior quarter, same number of days into it
      const qs = quarterStart(m)
      const pqs = qs === 0 ? 9 : qs - 3
      const py  = qs === 0 ? y - 1 : y
      const daysIn = (m - qs) * 30 + d
      const endDate = new Date(py, pqs, daysIn)
      return {
        start: { year: py, month: pqs, day: 1 },
        end:   { year: endDate.getFullYear(), month: endDate.getMonth(), day: endDate.getDate() },
        label: `vs prior Q`,
      }
    }
    case 'this_year':
    default: {
      // Same Jan–today in prior year
      return { start: { year: y - 1, month: 0, day: 1 }, end: { year: y - 1, month: m, day: d }, label: `vs ${y - 1}` }
    }
  }
}

export function inRange(
  dateStr: string,
  range: DateRange,
  splitDate: (s: string) => { year: number; month: number; day: number } | null
): boolean {
  const d = splitDate(dateStr)
  if (!d) return false
  const ts    = Date.UTC(d.year, d.month, d.day)
  const start = Date.UTC(range.start.year, range.start.month, range.start.day)
  const end   = Date.UTC(range.end.year,   range.end.month,   range.end.day)
  return ts >= start && ts <= end
}

export const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'this_month',   label: 'This month' },
  { value: 'last_month',   label: 'Last month' },
  { value: 'last_30',      label: 'Last 30 days' },
  { value: 'last_7',       label: 'Last 7 days' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_year',    label: 'This year (YTD)' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
