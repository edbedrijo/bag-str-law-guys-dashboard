export const dynamic = 'force-dynamic'

import { getLeads, getAppointments, getCeoDashboardAdSpend } from '@/lib/sheets'
import KpiCard from '@/components/KpiCard'
import MonthlyChart from '@/components/MonthlyChart'
import CashBySourceDonut from '@/components/CashBySourceDonut'
import LeadQualityChart from '@/components/LeadQualityChart'
import CashTrendChart from '@/components/CashTrendChart'
import PageHeader from '@/components/PageHeader'
import type { LeadQualityDataPoint } from '@/components/LeadQualityChart'
import type { CashTrendDataPoint } from '@/components/CashTrendChart'
import type { MonthlyDataPoint } from '@/components/MonthlyChart'
import type { AppointmentRow, LeadRow } from '@/types/appointments'
import { Users, CalendarDays, Phone, CheckCircle2, DollarSign, Clock } from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

function computeMonthKpis(leadRows: LeadRow[], rows: AppointmentRow[], year: number, month: number) {
  const leads = leadRows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === year && d.month === month
  }).length

  const monthRows = rows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === year && d.month === month
  })
  const bookedEligible = monthRows.filter(
    (r) => r.callStatus && r.callStatus.toLowerCase() !== 'rescheduled' && r.email && r.email !== ''
  )
  const booked = new Set(bookedEligible.map((r) => r.email.toLowerCase())).size
  const showed = monthRows.filter((r) => r.callStatus === 'Showed').length
  const won = monthRows.filter((r) => r.callOutcome === 'WON')
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
  return { leads, booked, showed, closed, cash, avgDays: dayCount > 0 ? parseFloat((totalDays / dayCount).toFixed(1)) : 0 }
}

function makeDelta(current: number, prior: number, label: string, invert = false) {
  const diff = current - prior
  const pct = prior > 0 ? (diff / prior) * 100 : 0
  return { diff, pct, label, invert }
}

function computeKpis(leadRows: LeadRow[], rows: AppointmentRow[]) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const priorMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const priorYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const filteredLeads = leadRows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === currentYear
  })
  const leads = filteredLeads.length

  const filtered = rows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === currentYear
  })
  const bookedEligible = filtered.filter(
    (r) => r.callStatus && r.callStatus.toLowerCase() !== 'rescheduled' && r.email && r.email !== ''
  )
  const booked = new Set(bookedEligible.map((r) => r.email.toLowerCase())).size
  const showed = filtered.filter((r) => r.callStatus === 'Showed').length
  const won = filtered.filter((r) => r.callOutcome === 'WON')
  const closed = won.length
  const cashCollected = won.reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)

  let totalDays = 0, dayCount = 0
  for (const r of won) {
    const di = splitDate(r.dateIn)
    const dc = splitDate(r.callDate)
    if (di && dc) {
      const msPerDay = 1000 * 60 * 60 * 24
      const diff = Math.round((Date.UTC(dc.year, dc.month, dc.day) - Date.UTC(di.year, di.month, di.day)) / msPerDay)
      if (diff >= 0) { totalDays += diff; dayCount++ }
    }
  }
  const avgDaysToPaid = dayCount > 0 ? (totalDays / dayCount).toFixed(1) : '0'

  const monthly: Record<number, MonthlyDataPoint> = {}
  for (let m = 0; m < 12; m++) {
    monthly[m] = { month: MONTH_NAMES[m], leads: 0, booked: 0, showed: 0, closed: 0 }
  }
  for (const r of filtered) {
    const d = splitDate(r.dateIn)
    if (!d) continue
    const m = d.month
    monthly[m].leads++
    if (r.callStatus) monthly[m].booked++
    if (r.callStatus === 'Showed') monthly[m].showed++
    if (r.callOutcome === 'WON') monthly[m].closed++
  }
  const monthlyData = Object.values(monthly).slice(0, currentMonth + 1)

  const cashBySource: Record<string, number> = { Paid: 0, Referral: 0, Organic: 0 }
  for (const r of won) {
    cashBySource[classifySource(r)] += parseMoney(r.cashCollected)
  }

  // Pipeline: active deals not yet closed (Follow Up, Deposit Made, Need To Follow Up)
  const PIPELINE_STAGES = ['Follow Up Scheduled', 'Deposit Made', 'Need To Follow Up']
  const pipelineRows = filtered.filter((r) => PIPELINE_STAGES.includes(r.callOutcome))
  const pipelineCount = pipelineRows.length
  const pipelineValue = pipelineRows.reduce((sum, r) => sum + parseMoney(r.totalPrice), 0)
  const pipelineAvgDeal = pipelineCount > 0 ? pipelineValue / pipelineCount : 0

  // Lead quality distribution by month
  const QUALITY_TIERS = ['High Value', 'Qualified', 'So-So', 'Low Quality', 'Bad Lead'] as const
  const qualityMonthly: Record<number, LeadQualityDataPoint> = {}
  for (let m = 0; m < 12; m++) {
    qualityMonthly[m] = { month: MONTH_NAMES[m], 'High Value': 0, 'Qualified': 0, 'So-So': 0, 'Low Quality': 0, 'Bad Lead': 0 }
  }
  for (const r of filtered) {
    const d = splitDate(r.dateIn)
    if (!d || !r.leadQuality) continue
    const tier = QUALITY_TIERS.find((t) => r.leadQuality.trim() === t)
    if (tier) qualityMonthly[d.month][tier]++
  }
  const qualityData = Object.values(qualityMonthly).slice(0, currentMonth + 1)

  // Cash collected trend by month
  const cashTrend: CashTrendDataPoint[] = Array.from({ length: currentMonth + 1 }, (_, m) => ({
    month: MONTH_NAMES[m],
    cash: won.filter((r) => { const d = splitDate(r.callDate || r.dateIn); return d && d.month === m }).reduce((sum, r) => sum + parseMoney(r.cashCollected), 0),
  }))

  // Month-over-month deltas
  const cur = computeMonthKpis(leadRows, rows, currentYear, currentMonth)
  const prev = computeMonthKpis(leadRows, rows, priorYear, priorMonth)
  const dl = `vs ${MONTH_NAMES[priorMonth]}`
  const deltas = {
    leads:   makeDelta(cur.leads,   prev.leads,   dl),
    booked:  makeDelta(cur.booked,  prev.booked,  dl),
    showed:  makeDelta(cur.showed,  prev.showed,  dl),
    closed:  makeDelta(cur.closed,  prev.closed,  dl),
    cash:    makeDelta(cur.cash,    prev.cash,    dl),
    avgDays: makeDelta(cur.avgDays, prev.avgDays, dl, true),
  }

  return { leads, booked, showed, closed, cashCollected, avgDaysToPaid, monthlyData, cashBySource, deltas, pipelineCount, pipelineValue, pipelineAvgDeal, qualityData, cashTrend }
}

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default async function OverviewPage() {
  const [leadRows, rows, adSpendRaw] = await Promise.all([
    getLeads(),
    getAppointments(),
    getCeoDashboardAdSpend(),
  ])

  const { leads, booked, showed, closed, cashCollected, avgDaysToPaid, monthlyData, cashBySource, deltas, pipelineCount, pipelineValue, pipelineAvgDeal, qualityData, cashTrend } = computeKpis(leadRows, rows)

  const adSpendMtd = parseMoney(adSpendRaw[0] ?? '')
  const paidLeads = leads > 0 ? leads : 1
  const paidBooked = booked > 0 ? booked : 1
  const costPerLead = adSpendMtd / paidLeads
  const costPerBooked = adSpendMtd / paidBooked
  const costPerQualified = showed > 0 ? adSpendMtd / showed : 0

  const totalCash = cashBySource.Paid + cashBySource.Referral + cashBySource.Organic
  const showRate = booked > 0 ? ((showed / booked) * 100).toFixed(1) : '0'
  const closeRate = showed > 0 ? ((closed / showed) * 100).toFixed(1) : '0'
  const currentMonthName = MONTH_NAMES[new Date().getMonth()]
  const currentYear = new Date().getFullYear()

  return (
    <div>
      <PageHeader title="Overview" />

      {/* Top KPI row */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Leads"
          value={leads.toLocaleString()}
          sub={`Jan–${currentMonthName} ${currentYear}`}
          icon={Users}
          iconColor="text-teal-500"
          delta={deltas.leads}
        />
        <KpiCard
          label="Calls Booked"
          value={booked.toLocaleString()}
          sub={`${((booked / leads) * 100).toFixed(1)}% of leads`}
          icon={CalendarDays}
          iconColor="text-cyan-500"
          delta={deltas.booked}
        />
        <KpiCard
          label="Qualified Calls"
          value={showed.toLocaleString()}
          sub={`${showRate}% show rate`}
          icon={Phone}
          iconColor="text-green-500"
          delta={deltas.showed}
        />
        <KpiCard
          label="Deals Closed"
          value={closed.toLocaleString()}
          sub={`${closeRate}% close rate`}
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          delta={deltas.closed}
        />
        <KpiCard
          label="Cash Collected"
          value={fmt(cashCollected)}
          sub="All sources"
          icon={DollarSign}
          iconColor="text-blue-500"
          delta={deltas.cash}
        />
        <KpiCard
          label="Avg Days to Paid"
          value={`${avgDaysToPaid}d`}
          sub="Strategy mtg → paid"
          icon={Clock}
          iconColor="text-gray-400"
          delta={deltas.avgDays}
        />
      </div>

      {/* Ad Spend block */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">{currentMonthName} {currentYear} ad spend</h2>
        <p className="text-sm text-gray-400 mb-4">Month-to-date paid media spend and efficiency (Facebook ads)</p>
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Ad Spend (MTD)" value={fmt(adSpendMtd)} sub={`${currentMonthName} ${currentYear}`} icon={DollarSign} iconColor="text-blue-500" />
          <KpiCard label="Cost / Lead" value={fmt(costPerLead)} sub={`${leads} leads`} icon={Users} iconColor="text-teal-500" />
          <KpiCard label="Cost / Booked Call" value={fmt(costPerBooked)} sub={`${booked} booked`} icon={CalendarDays} iconColor="text-cyan-500" />
          <KpiCard label="Cost / Paid Booked Call" value={fmt(costPerQualified)} sub={`${showed} paid-source booked`} icon={Phone} iconColor="text-green-500" />
        </div>
      </div>

      {/* Monthly performance + Cash by source side by side */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Monthly performance</h2>
          <p className="text-sm text-gray-400 mb-4">Leads, booked calls, qualified (held) calls and closed deals</p>
          <MonthlyChart data={monthlyData} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Cash by source</h2>
          <p className="text-sm text-gray-400 mb-3">Where revenue actually comes from</p>
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
          <KpiCard
            label="Pipeline Deals"
            value={pipelineCount}
            sub="Active opportunities"
            icon={CheckCircle2}
            iconColor="text-amber-500"
          />
          <KpiCard
            label="Pipeline Value"
            value={fmt(pipelineValue)}
            sub="Total contract value"
            icon={DollarSign}
            iconColor="text-teal-500"
          />
          <KpiCard
            label="Avg Deal Size"
            value={fmt(pipelineAvgDeal)}
            sub="In pipeline"
            icon={DollarSign}
            iconColor="text-cyan-500"
          />
        </div>
      </div>

      {/* Cash collected trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Cash collected trend</h2>
        <p className="text-sm text-gray-400 mb-4">Monthly cash, all sources combined</p>
        <CashTrendChart data={cashTrend} />
      </div>

      {/* Lead quality distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Lead quality distribution</h2>
        <p className="text-sm text-gray-400 mb-4">Monthly breakdown by lead quality tier — shows if ad quality is improving</p>
        <LeadQualityChart data={qualityData} />
      </div>
    </div>
  )
}
