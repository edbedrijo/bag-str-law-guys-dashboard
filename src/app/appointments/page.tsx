export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getAppointments } from '@/lib/sheets'
import { getDateRange, getPriorRange, inRange, type DateRangePreset } from '@/lib/dateRange'
import PageHeader from '@/components/PageHeader'
import KpiCard from '@/components/KpiCard'
import DateRangePicker from '@/components/DateRangePicker'
import AppointmentsTable from './AppointmentsTable'
import { AddApptButton } from './AppointmentModal'
import { CalendarDays, Phone, TrendingUp, CheckCircle2, DollarSign } from 'lucide-react'

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function splitDate(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length < 3) return null
  if (parts[0].length === 4) {
    return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1, day: parseInt(parts[2]) }
  }
  return { year: parseInt(parts[2]), month: parseInt(parts[0]) - 1, day: parseInt(parts[1]) }
}

function makeDelta(current: number, prior: number, label: string) {
  if (prior === 0) return undefined
  const diff = current - prior
  const pct = (diff / prior) * 100
  return { diff, pct, label }
}

function computeKpis(rows: Awaited<ReturnType<typeof getAppointments>>, range: ReturnType<typeof getDateRange>) {
  const filtered = rows.filter((r) => inRange(r.dateIn, range, splitDate))
  const total  = new Set(filtered.filter((r) => r.callStatus !== 'Rescheduled' && r.contactId).map((r) => r.contactId)).size
  const showed = filtered.filter((r) => r.callStatus === 'Showed').length
  const won    = filtered.filter((r) => r.callOutcome === 'WON').length
  const cash   = filtered.reduce((s, r) => s + parseMoney(r.cashCollected), 0)
  return { total, showed, won, cash }
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const params = await searchParams
  const preset = (params?.range ?? 'this_year') as DateRangePreset

  const now = new Date()
  const range      = getDateRange(preset, now)
  const priorRange = getPriorRange(preset, now)

  const rows = await getAppointments()

  const cur  = computeKpis(rows, range)
  const prev = computeKpis(rows, priorRange)

  const showRate = cur.total > 0 ? ((cur.showed / cur.total) * 100).toFixed(1) : '0'

  const dl = priorRange.label
  const deltas = {
    total:  makeDelta(cur.total,  prev.total,  dl),
    showed: makeDelta(cur.showed, prev.showed, dl),
    won:    makeDelta(cur.won,    prev.won,    dl),
    cash:   makeDelta(cur.cash,   prev.cash,   dl),
  }

  const unique = (fn: (r: typeof rows[0]) => string) =>
    [...new Set(rows.map(fn).filter(Boolean))].sort()

  const options = {
    setters:   unique((r) => r.setter?.trim()),
    closers:   unique((r) => r.closer?.trim()),
    calendars: unique((r) => r.calendar?.trim()),
  }

  return (
    <>
      <PageHeader title="Appointments" />

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Period Performance</h2>
          <p className="text-xs text-gray-400">Filtered by selected date range · Date In</p>
        </div>
        <Suspense>
          <DateRangePicker current={preset} />
        </Suspense>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="Total Appointments"
          value={cur.total}
          sub={range.label}
          icon={CalendarDays}
          iconColor="text-blue-500"
          delta={deltas.total}
        />
        <KpiCard
          label="Showed"
          value={cur.showed}
          sub={range.label}
          icon={Phone}
          iconColor="text-teal-500"
          delta={deltas.showed}
        />
        <KpiCard
          label="Show Rate"
          value={`${showRate}%`}
          sub="Showed ÷ Total Appts"
          icon={TrendingUp}
          iconColor="text-cyan-500"
        />
        <KpiCard
          label="Won"
          value={cur.won}
          sub={range.label}
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          delta={deltas.won}
        />
        <KpiCard
          label="Cash Collected"
          value={fmt(cur.cash)}
          sub={range.label}
          icon={DollarSign}
          iconColor="text-amber-500"
          delta={deltas.cash}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Appointments</h2>
            <p className="text-sm text-gray-400">All records from the Appointments sheet</p>
          </div>
          <div className="flex items-start gap-4">
            <p className="text-xs text-gray-300 mt-1 text-right leading-relaxed">
              Drag headers to reorder<br />Drag right edge to resize
            </p>
            <AddApptButton options={options} />
          </div>
        </div>
        <Suspense fallback={<div className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</div>}>
          <AppointmentsTable rows={rows} options={options} />
        </Suspense>
      </div>
    </>
  )
}
