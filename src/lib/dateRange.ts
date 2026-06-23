export type DateRangePreset =
  | 'this_week'
  | 'last_week'
  | 'last_7'
  | 'last_30'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'

export interface DateRange {
  start: { year: number; month: number; day: number }
  end:   { year: number; month: number; day: number }
  label: string
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}


export function getDateRange(preset: DateRangePreset, today = new Date()): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  switch (preset) {
    case 'this_week': {
      // Sunday-based week
      const dow = today.getDay()  // 0=Sun
      const from = new Date(today); from.setDate(from.getDate() - dow)
      return {
        start: { year: from.getFullYear(), month: from.getMonth(), day: from.getDate() },
        end:   { year: y, month: m, day: d },
        label: 'This week',
      }
    }

    case 'last_week': {
      const dow = today.getDay()  // 0=Sun
      const sun = new Date(today); sun.setDate(sun.getDate() - dow - 7)  // prev Sunday
      const sat = new Date(sun);  sat.setDate(sat.getDate() + 6)          // prev Saturday
      return {
        start: { year: sun.getFullYear(), month: sun.getMonth(), day: sun.getDate() },
        end:   { year: sat.getFullYear(), month: sat.getMonth(), day: sat.getDate() },
        label: 'Last week',
      }
    }

    case 'last_7': {
      const from = new Date(today)
      from.setDate(from.getDate() - 7)
      return {
        start: { year: from.getFullYear(), month: from.getMonth(), day: from.getDate() },
        end:   { year: y, month: m, day: d },
        label: 'Last 7 days',
      }
    }

    case 'last_30': {
      const from = new Date(today)
      from.setDate(from.getDate() - 30)
      return {
        start: { year: from.getFullYear(), month: from.getMonth(), day: from.getDate() },
        end:   { year: y, month: m, day: d },
        label: 'Last 30 days',
      }
    }

    case 'this_month':
      return { start: { year: y, month: m, day: 1 }, end: { year: y, month: m, day: d }, label: `${MONTHS[m]} ${y}` }

    case 'last_month': {
      const pm = m === 0 ? 11 : m - 1
      const py = m === 0 ? y - 1 : y
      return { start: { year: py, month: pm, day: 1 }, end: { year: py, month: pm, day: daysInMonth(py, pm) }, label: `${MONTHS[pm]} ${py}` }
    }

    case 'last_year':
      return { start: { year: y - 1, month: 0, day: 1 }, end: { year: y - 1, month: 11, day: 31 }, label: `${y - 1}` }

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
    case 'this_week': {
      // Prior week: Sunday-Saturday before current week
      const dow = today.getDay()  // 0=Sun
      const sun = new Date(today); sun.setDate(sun.getDate() - dow - 7)
      const sat = new Date(sun);  sat.setDate(sat.getDate() + 6)
      return {
        start: { year: sun.getFullYear(), month: sun.getMonth(), day: sun.getDate() },
        end:   { year: sat.getFullYear(), month: sat.getMonth(), day: sat.getDate() },
        label: 'vs last week',
      }
    }
    case 'last_week': {
      // Week before last: Sunday-Saturday two weeks ago
      const dow = today.getDay()  // 0=Sun
      const sun = new Date(today); sun.setDate(sun.getDate() - dow - 14)
      const sat = new Date(sun);  sat.setDate(sat.getDate() + 6)
      return {
        start: { year: sun.getFullYear(), month: sun.getMonth(), day: sun.getDate() },
        end:   { year: sat.getFullYear(), month: sat.getMonth(), day: sat.getDate() },
        label: 'vs prior week',
      }
    }
    case 'last_30':
    case 'last_7': {
      const days = preset === 'last_30' ? 30 : 8
      const toDate = new Date(today); toDate.setDate(toDate.getDate() - days)
      const fromDate = new Date(toDate); fromDate.setDate(fromDate.getDate() - days + 1)
      return {
        start: { year: fromDate.getFullYear(), month: fromDate.getMonth(), day: fromDate.getDate() },
        end:   { year: toDate.getFullYear(),   month: toDate.getMonth(),   day: toDate.getDate() },
        label: `vs prior ${days}d`,
      }
    }
    case 'this_month': {
      const pm = m === 0 ? 11 : m - 1
      const py = m === 0 ? y - 1 : y
      return { start: { year: py, month: pm, day: 1 }, end: { year: py, month: pm, day: daysInMonth(py, pm) }, label: `vs ${MONTHS[pm]}` }
    }
    case 'last_month': {
      const pm = m <= 1 ? 10 + m : m - 2
      const py = m <= 1 ? y - 1 : y
      return { start: { year: py, month: pm, day: 1 }, end: { year: py, month: pm, day: daysInMonth(py, pm) }, label: `vs ${MONTHS[pm]}` }
    }
    case 'last_year':
      return { start: { year: y - 2, month: 0, day: 1 }, end: { year: y - 2, month: 11, day: 31 }, label: `vs ${y - 2}` }
    case 'this_year':
    default:
      return { start: { year: y - 1, month: 0, day: 1 }, end: { year: y - 1, month: m, day: d }, label: `vs ${y - 1}` }
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
  { value: 'this_week',  label: 'This week' },
  { value: 'last_week',  label: 'Last week' },
  { value: 'last_7',     label: 'Last 7 days' },
  { value: 'last_30',    label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year',  label: 'This year' },
  { value: 'last_year',  label: 'Last year' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
