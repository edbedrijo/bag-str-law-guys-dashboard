export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getLeads, getAppointments, getCeoDashboard } from '@/lib/sheets'
import { getDateRange, getPriorRange, inRange, type DateRangePreset } from '@/lib/dateRange'
import KpiCard from '@/components/KpiCard'
import MonthlyChart from '@/components/MonthlyChart'
import CashBySourceDonut from '@/components/CashBySourceDonut'
import LeadQualityChart from '@/components/LeadQualityChart'
import CashTrendChart from '@/components/CashTrendChart'
import DateRangePicker from '@/components/DateRangePicker'
import type { LeadQualityDataPoint } from '@/components/LeadQualityChart'
import type { CashTrendDataPoint } from '@/components/CashTrendChart'
import type { MonthlyDataPoint } from '@/components/MonthlyChart'
import type { AppointmentRow, LeadRow } from '@/types/appointments'
import { Users, CalendarDays, Phone, CheckCircle2, DollarSign, Clock, PhoneOff, XCircle, TrendingUp } from 'lucide-react'

const MONTH_NAMES      = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
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

function classifySource(row: AppointmentRow): 'Paid' | 'Referral' | 'Organic' {
  const src = (row.trafficSource || '').toLowerCase()
  if (src.includes('paid') || src.includes('facebook') || src.includes('fb')) return 'Paid'
  if (src.includes('referral') || src.includes('ref')) return 'Referral'
  return 'Organic'
}

function makeDelta(current: number, prior: number, label: string, invert = false) {
  const diff = current - prior
  const pct = prior > 0 ? (diff / prior) * 100 : 0
  return { diff, pct, label, invert }
}

function computeRangeKpis(leadRows: LeadRow[], rows: AppointmentRow[], range: ReturnType<typeof getDateRange>) {
  const filteredLeads = leadRows.filter((r) => inRange(r.dateIn, range, splitDate))
  const leads = filteredLeads.length

  const filtered = rows.filter((r) => inRange(r.dateIn, range, splitDate))
  const bookedEligible = filtered.filter(
    (r) => r.callStatus && r.callStatus.toLowerCase() !== 'rescheduled' && r.email && r.email !== ''
  )
  const booked = new Set(bookedEligible.map((r) => r.email.toLowerCase())).size
  const showed = filtered.filter((r) => r.callStatus === 'Showed').length
  const won = filtered.filter((r) => r.callOutcome === 'WON')
  const closed = won.length
  const cash = won.reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)

  let totalDays = 0, dayCount = 0
  for (const r of won) {
    const di = splitDate(r.dateIn)
    const dc = splitDate(r.callDate)
    if (di && dc) {
      const diff = Math.round((Date.UTC(dc.year, dc.month, dc.day) - Date.UTC(di.year, di.month, di.day)) / 86400000)
      if (diff >= 0) { totalDays += diff; dayCount++ }
    }
  }
  const avgDays = dayCount > 0 ? parseFloat((totalDays / dayCount).toFixed(1)) : 0

  const noShows  = filtered.filter((r) => r.callStatus === 'No Show').length
  const cancelled = filtered.filter((r) => r.callStatus === 'Cancelled').length

  return { leads, booked, showed, closed, cash, avgDays, won, filtered, noShows, cancelled }
}

// Generate weeks of the current month (Sun-start, matching sheet formula)
function getMonthWeeks(year: number, month: number, today: Date) {
  const firstMs = Date.UTC(year, month, 1)
  const first = new Date(firstMs)
  const dow = first.getUTCDay() // 0=Sun
  // Week 1 ends on the first Saturday of the month (or last day if earlier)
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  const weeks: { label: string; start: number; end: number }[] = []
  let weekStart = 1
  // First week ends on Saturday = day 1 + (6 - dow) or end of month
  let weekEnd = 1 + (6 - dow)
  let weekNum = 1

  while (weekStart <= lastDayOfMonth) {
    const actualEnd = Math.min(weekEnd, lastDayOfMonth)
    const startMs = Date.UTC(year, month, weekStart)
    const endMs   = Date.UTC(year, month, actualEnd)
    // Only include weeks that have started
    if (startMs <= todayMs) {
      weeks.push({
        label: `Week ${weekNum} (${MONTH_NAMES[month]} ${weekStart}–${actualEnd})`,
        start: startMs,
        end:   Math.min(endMs, todayMs),
      })
    }
    weekStart = actualEnd + 1
    weekEnd   = weekStart + 6
    weekNum++
  }
  return weeks
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const params = await searchParams
  const preset = (params?.range ?? 'this_year') as DateRangePreset

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentMonthName = FULL_MONTH_NAMES[currentMonth]

  const range      = getDateRange(preset, now)
  const priorRange = getPriorRange(preset, now)

  const [leadRows, rows, ceoDash] = await Promise.all([
    getLeads(),
    getAppointments(),
    getCeoDashboard(),
  ])

  // KPIs for selected range
  const cur  = computeRangeKpis(leadRows, rows, range)
  const prev = computeRangeKpis(leadRows, rows, priorRange)

  const { leads, booked, showed, closed, cash: cashCollected, avgDays, won, filtered } = cur

  const avgDaysToPaid = avgDays > 0 ? avgDays.toFixed(1) : '0'
  const dl = priorRange.label
  const deltas = {
    leads:   makeDelta(cur.leads,   prev.leads,   dl),
    booked:  makeDelta(cur.booked,  prev.booked,  dl),
    showed:  makeDelta(cur.showed,  prev.showed,  dl),
    closed:  makeDelta(cur.closed,  prev.closed,  dl),
    cash:    makeDelta(cur.cash,    prev.cash,    dl),
    avgDays: makeDelta(cur.avgDays, prev.avgDays, dl, true),
  }

  const showRate  = booked > 0 ? ((showed / booked) * 100).toFixed(1) : '0'
  const closeRate = showed > 0 ? ((closed / showed) * 100).toFixed(1) : '0'

  // "This Month at a Glance" — pull from CEO Dashboard sheet (always current month)
  // Monthly rows: index 0 = January, so currentMonth index maps directly
  const ceoDashMonth = ceoDash.monthly[currentMonth] ?? {
    adSpend: 0, leads: 0, booked: 0, showed: 0, noShows: 0, cancelled: 0,
    showRate: '0%', dealsWon: 0, revenue: 0, avgDeal: 0, cpl: 0, costPerShow: 0, closeRate: '0%', period: '',
  }
  const adSpendMtd    = ceoDash.weekly.reduce((sum, w) => sum + w.adSpend, 0)
  const costPerLead   = ceoDashMonth.cpl
  const costPerBooked = ceoDashMonth.booked > 0 ? adSpendMtd / ceoDashMonth.booked : 0

  // Weekly breakdown from CEO Dashboard sheet directly
  const weeklyRows = ceoDash.weekly.map((w) => ({
    label:     w.period,
    adSpend:   w.adSpend,
    leads:     w.leads,
    booked:    w.booked,
    showed:    w.showed,
    noShows:   w.noShows,
    cancelled: w.cancelled,
    showRate:  w.showRate,
    closed:    w.dealsWon,
    revenue:   w.revenue,
  }))

  // Always show full-year trend charts regardless of range picker
  const ytdRows = rows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === currentYear
  })
  const ytdWon = ytdRows.filter((r) => r.callOutcome === 'WON')

  const monthly: Record<number, MonthlyDataPoint> = {}
  for (let m = 0; m < 12; m++) {
    monthly[m] = { month: MONTH_NAMES[m], leads: 0, booked: 0, showed: 0, closed: 0 }
  }
  for (const r of ytdRows) {
    const d = splitDate(r.dateIn)
    if (!d) continue
    monthly[d.month].leads++
    if (r.callStatus) monthly[d.month].booked++
    if (r.callStatus === 'Showed') monthly[d.month].showed++
    if (r.callOutcome === 'WON') monthly[d.month].closed++
  }
  const monthlyData = Object.values(monthly).slice(0, currentMonth + 1)

  const cashBySource: Record<string, number> = { Paid: 0, Referral: 0, Organic: 0 }
  for (const r of ytdWon) {
    cashBySource[classifySource(r)] += parseMoney(r.cashCollected)
  }
  const totalCash = cashBySource.Paid + cashBySource.Referral + cashBySource.Organic

  const cashTrend: CashTrendDataPoint[] = Array.from({ length: currentMonth + 1 }, (_, m) => ({
    month: MONTH_NAMES[m],
    cash: ytdWon
      .filter((r) => { const d = splitDate(r.callDate || r.dateIn); return d && d.month === m })
      .reduce((sum, r) => sum + parseMoney(r.cashCollected), 0),
  }))

  const QUALITY_TIERS = ['High Value', 'Qualified', 'So-So', 'Low Quality', 'Bad Lead'] as const
  const qualityMonthly: Record<number, LeadQualityDataPoint> = {}
  for (let m = 0; m < 12; m++) {
    qualityMonthly[m] = { month: MONTH_NAMES[m], 'High Value': 0, 'Qualified': 0, 'So-So': 0, 'Low Quality': 0, 'Bad Lead': 0 }
  }
  for (const r of ytdRows) {
    const d = splitDate(r.dateIn)
    if (!d || !r.leadQuality) continue
    const tier = QUALITY_TIERS.find((t) => r.leadQuality.trim() === t)
    if (tier) qualityMonthly[d.month][tier]++
  }
  const qualityData = Object.values(qualityMonthly).slice(0, currentMonth + 1)

  const PIPELINE_STAGES = ['Follow Up Scheduled', 'Deposit Made', 'Need To Follow Up']
  const pipelineRows = ytdRows.filter((r) => PIPELINE_STAGES.includes(r.callOutcome))
  const pipelineCount    = pipelineRows.length
  const pipelineValue    = pipelineRows.reduce((sum, r) => sum + parseMoney(r.totalPrice), 0)
  const pipelineAvgDeal  = pipelineCount > 0 ? pipelineValue / pipelineCount : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{range.label}</span>
          <Suspense>
            <DateRangePicker current={preset} />
          </Suspense>
        </div>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard label="Leads"          value={leads.toLocaleString()}   sub={range.label}               icon={Users}        iconColor="text-teal-500"   delta={deltas.leads} />
        <KpiCard label="Calls Booked"   value={booked.toLocaleString()}  sub={`${((leads > 0 ? booked/leads : 0)*100).toFixed(1)}% of leads`} icon={CalendarDays} iconColor="text-cyan-500"   delta={deltas.booked} />
        <KpiCard label="Qualified Calls" value={showed.toLocaleString()} sub={`${showRate}% show rate`}  icon={Phone}        iconColor="text-green-500"  delta={deltas.showed} />
        <KpiCard label="Deals Closed"   value={closed.toLocaleString()}  sub={`${closeRate}% close rate`} icon={CheckCircle2} iconColor="text-emerald-500" delta={deltas.closed} />
        <KpiCard label="Cash Collected" value={fmt(cashCollected)}       sub="All sources"               icon={DollarSign}   iconColor="text-blue-500"   delta={deltas.cash} />
        <KpiCard label="Avg Days to Paid" value={`${avgDaysToPaid}d`}   sub="Strategy mtg → paid"       icon={Clock}        iconColor="text-gray-400"   delta={deltas.avgDays} />
      </div>

      {/* Ad Spend — current month weekly breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">This Month at a Glance</h2>
        <p className="text-sm text-gray-400 mb-4">{currentMonthName} {currentYear}</p>

        {/* MTD tiles — 9 compact cards in a single row */}
        <div className="grid grid-cols-9 gap-2 mb-5">
          <KpiCard compact label="Ad Spend (MTD)"  value={fmt(adSpendMtd)}                        sub={`${currentMonthName} ${currentYear}`} icon={DollarSign}   iconColor="text-blue-500"    valueColor="text-blue-600" />
          <KpiCard compact label="Total Leads"     value={ceoDashMonth.leads.toLocaleString()}     sub={`${currentMonthName} ${currentYear}`} icon={Users}        iconColor="text-teal-500"    valueColor="text-teal-600" />
          <KpiCard compact label="Cost / Lead"     value={fmt(costPerLead)}                        sub={`${ceoDashMonth.leads} leads`}        icon={DollarSign}   iconColor="text-teal-500"    valueColor="text-teal-600" />
          <KpiCard compact label="Calls Booked"    value={ceoDashMonth.booked.toLocaleString()}    sub={`${currentMonthName} ${currentYear}`} icon={CalendarDays} iconColor="text-cyan-500"    valueColor="text-cyan-600" />
          <KpiCard compact label="Cost / Booked"   value={fmt(costPerBooked)}                      sub={`${ceoDashMonth.booked} booked`}      icon={DollarSign}   iconColor="text-cyan-500"    valueColor="text-cyan-600" />
          <KpiCard compact label="Calls Showed"    value={ceoDashMonth.showed.toLocaleString()}    sub={`${currentMonthName} ${currentYear}`} icon={Phone}        iconColor="text-green-500"   valueColor="text-green-600" />
          <KpiCard compact label="No Shows"        value={ceoDashMonth.noShows.toLocaleString()}   sub={`${currentMonthName} ${currentYear}`} icon={PhoneOff}     iconColor="text-red-400"     valueColor="text-red-500" />
          <KpiCard compact label="Calls Cancelled" value={ceoDashMonth.cancelled.toLocaleString()} sub={`${currentMonthName} ${currentYear}`} icon={XCircle}      iconColor="text-gray-400"    valueColor="text-gray-600" />
          <KpiCard compact label="Show Rate"       value={ceoDashMonth.showRate}                   sub="Showed ÷ Booked"                      icon={TrendingUp}   iconColor="text-emerald-500" valueColor="text-emerald-600" />
        </div>

        {/* Weekly table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-400 font-medium">Week</th>
              <th className="text-right py-2 text-gray-400 font-medium">Ad Spend</th>
              <th className="text-right py-2 text-gray-400 font-medium">Leads</th>
              <th className="text-right py-2 text-gray-400 font-medium">Booked</th>
              <th className="text-right py-2 text-gray-400 font-medium">Showed</th>
              <th className="text-right py-2 text-gray-400 font-medium">No Shows</th>
              <th className="text-right py-2 text-gray-400 font-medium">Cancelled</th>
              <th className="text-right py-2 text-gray-400 font-medium">Show Rate</th>
              <th className="text-right py-2 text-gray-400 font-medium">Deals Won</th>
              <th className="text-right py-2 text-gray-400 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {weeklyRows.map((w) => (
              <tr key={w.label} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2 text-teal-600 font-medium text-xs">{w.label}</td>
                <td className="py-2 text-right text-gray-700">{w.adSpend > 0 ? fmt(w.adSpend) : '—'}</td>
                <td className="py-2 text-right text-gray-700">{w.leads}</td>
                <td className="py-2 text-right text-gray-700">{w.booked}</td>
                <td className="py-2 text-right text-gray-700">{w.showed}</td>
                <td className="py-2 text-right text-red-400">{w.noShows}</td>
                <td className="py-2 text-right text-gray-400">{w.cancelled}</td>
                <td className="py-2 text-right text-gray-500">{w.showRate}</td>
                <td className="py-2 text-right text-gray-700">{w.closed}</td>
                <td className="py-2 text-right text-gray-700">{w.revenue > 0 ? fmt(w.revenue) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly performance + Cash by source side by side */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Monthly performance</h2>
          <p className="text-sm text-gray-400 mb-4">January–{currentMonthName} {currentYear} — leads, booked, qualified, closed</p>
          <MonthlyChart data={monthlyData} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Cash by source</h2>
          <p className="text-sm text-gray-400 mb-3">January–{currentMonthName} {currentYear}</p>
          <CashBySourceDonut data={[
            { label: 'Referral', color: '#f97316', amount: cashBySource.Referral, pct: totalCash > 0 ? `${((cashBySource.Referral / totalCash) * 100).toFixed(1)}%` : '0%' },
            { label: 'Paid',     color: '#0ea5e9', amount: cashBySource.Paid,     pct: totalCash > 0 ? `${((cashBySource.Paid     / totalCash) * 100).toFixed(1)}%` : '0%' },
            { label: 'Organic',  color: '#10b981', amount: cashBySource.Organic,  pct: totalCash > 0 ? `${((cashBySource.Organic  / totalCash) * 100).toFixed(1)}%` : '0%' },
          ]} />
        </div>
      </div>

      {/* Pipeline value */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Active pipeline</h2>
        <p className="text-sm text-gray-400 mb-4">Deals in motion — Follow Up Scheduled, Deposit Made, Need To Follow Up</p>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Pipeline Deals" value={pipelineCount}        sub="Active opportunities"  icon={CheckCircle2} iconColor="text-amber-500" />
          <KpiCard label="Pipeline Value" value={fmt(pipelineValue)}   sub="Total contract value"  icon={DollarSign}   iconColor="text-teal-500" />
          <KpiCard label="Avg Deal Size"  value={fmt(pipelineAvgDeal)} sub="In pipeline"            icon={DollarSign}   iconColor="text-cyan-500" />
        </div>
      </div>

      {/* Cash collected trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Cash collected trend</h2>
        <p className="text-sm text-gray-400 mb-4">January–{currentMonthName} {currentYear} — monthly cash, all sources combined</p>
        <CashTrendChart data={cashTrend} />
      </div>

      {/* Lead quality distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Lead quality distribution</h2>
        <p className="text-sm text-gray-400 mb-4">January–{currentMonthName} {currentYear} — monthly breakdown by lead quality tier</p>
        <LeadQualityChart data={qualityData} />
      </div>
    </div>
  )
}
