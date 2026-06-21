export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getLeads, getAppointments, getCeoDashboard, getClosedDeals } from '@/lib/sheets'
import { getMonthlyAdSpend } from '@/lib/ghl'
import { getDateRange, getPriorRange, inRange, type DateRangePreset } from '@/lib/dateRange'
import KpiCard from '@/components/KpiCard'
import MonthlyChart from '@/components/MonthlyChart'
import CloserRevenueChart from '@/components/CloserRevenueChart'
import LeadQualityChart from '@/components/LeadQualityChart'
import CashTrendChart from '@/components/CashTrendChart'
import RevenueTrendChart from '@/components/RevenueTrendChart'
import ConversionFunnel from '@/components/ConversionFunnel'
import DateRangePicker from '@/components/DateRangePicker'
import type { LeadQualityDataPoint } from '@/components/LeadQualityChart'
import type { CashTrendDataPoint } from '@/components/CashTrendChart'
import type { MonthlyDataPoint } from '@/components/MonthlyChart'
import type { RevenueTrendPoint } from '@/components/RevenueTrendChart'
import type { AppointmentRow, LeadRow } from '@/types/appointments'
import { Users, CalendarDays, Phone, CheckCircle2, DollarSign, TrendingUp, Trophy } from 'lucide-react'

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

// Returns null when prior is zero — hides delta row in that case
function makeDelta(current: number, prior: number, label: string, invert = false) {
  if (prior === 0) return undefined
  const diff = current - prior
  const pct = (diff / prior) * 100
  return { diff, pct, label, invert }
}

function computeRangeKpis(leadRows: LeadRow[], rows: AppointmentRow[], range: ReturnType<typeof getDateRange>, closedCashByEmail: Map<string, number> = new Map()) {
  const filteredLeads = leadRows.filter((r) => inRange(r.dateIn, range, splitDate))
  const leads = filteredLeads.length

  const filtered = rows.filter((r) => inRange(r.dateIn, range, splitDate))
  const bookedEligible = filtered.filter(
    (r) => r.callStatus && r.callStatus.toLowerCase() !== 'rescheduled' && r.email && r.email !== ''
  )
  const booked   = new Set(bookedEligible.map((r) => r.email.toLowerCase())).size
  const showed   = filtered.filter((r) => r.callStatus === 'Showed').length
  const cash     = filtered.filter((r) => r.callOutcome === 'WON').reduce((sum, r) => {
    const emailKey = r.email?.toLowerCase()
    return sum + (emailKey && closedCashByEmail.has(emailKey) ? closedCashByEmail.get(emailKey)! : parseMoney(r.cashCollected))
  }, 0)
  const noShows  = filtered.filter((r) => r.callStatus === 'No Show').length
  const cancelled = filtered.filter((r) => r.callStatus === 'Cancelled').length

  return { leads, booked, showed, cash, filtered, noShows, cancelled }
}

// Generate weeks of the current month (Sun-start, matching sheet formula)
function getMonthWeeks(year: number, month: number, today: Date) {
  const first = new Date(Date.UTC(year, month, 1))
  const dow   = first.getUTCDay()
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  const weeks: { label: string; start: number; end: number }[] = []
  let weekStart = 1
  let weekEnd   = 1 + (6 - dow)
  let weekNum   = 1

  while (weekStart <= lastDayOfMonth) {
    const actualEnd = Math.min(weekEnd, lastDayOfMonth)
    const startMs   = Date.UTC(year, month, weekStart)
    const endMs     = Date.UTC(year, month, actualEnd)
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

function dateToMs(dateStr: string): number {
  const d = splitDate(dateStr)
  if (!d) return 0
  return Date.UTC(d.year, d.month, d.day)
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
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentMonthName = FULL_MONTH_NAMES[currentMonth]

  const range      = getDateRange(preset, now)
  const priorRange = getPriorRange(preset, now)

  const [leadRows, rows, ceoDash, ghlAdSpend, closedDeals] = await Promise.all([
    getLeads(),
    getAppointments(),
    getCeoDashboard(),
    getMonthlyAdSpend(currentYear, currentMonth),
    getClosedDeals(),
  ])

  // ── Top tile KPIs from Appointments tab ─────────────────────────────────────
  // Build closed deals cash map so the appointment loop prefers the more accurate sheet value
  const closedCashByEmail = new Map(
    closedDeals
      .filter((d) => d.email && parseMoney(d.cashCollected) > 0)
      .map((d) => [d.email.toLowerCase(), parseMoney(d.cashCollected)])
  )
  const cur  = computeRangeKpis(leadRows, rows, range, closedCashByEmail)
  const prev = computeRangeKpis(leadRows, rows, priorRange, closedCashByEmail)

  // WON appointment emails already counted in cur — track to avoid double-counting orphans
  const wonEmailsInRange = new Set(
    cur.filtered.filter((r) => r.callOutcome === 'WON' && r.email).map((r) => r.email!.toLowerCase())
  )
  // Orphan cash: Closed Deals entries with cash but no matching WON appointment in range
  const orphanCashInRange = closedDeals
    .filter((d) => d.email && parseMoney(d.cashCollected) > 0 && inRange(d.intakeDate, range, splitDate) && !wonEmailsInRange.has(d.email.toLowerCase()))
    .reduce((sum, d) => sum + parseMoney(d.cashCollected), 0)

  const { leads, booked, showed, cash: apptCashCollected } = cur
  const cashCollected = apptCashCollected + orphanCashInRange

  const showRate = booked > 0 ? ((showed / booked) * 100).toFixed(1) : '0'

  // ── Top tile KPIs from Closed Deals sheet ───────────────────────────────────
  const closedInRange       = closedDeals.filter((d) => inRange(d.intakeDate, range, splitDate))
  const closedDealsInRange  = closedInRange.length
  const totalRevenueInRange = closedInRange.reduce((sum, d) => sum + parseMoney(d.amount), 0)

  const prevClosedInRange      = closedDeals.filter((d) => inRange(d.intakeDate, priorRange, splitDate))
  const prevClosedDealsInRange = prevClosedInRange.length
  const prevTotalRevenue       = prevClosedInRange.reduce((sum, d) => sum + parseMoney(d.amount), 0)

  const closeRateVal = showed > 0 ? ((closedDealsInRange / showed) * 100).toFixed(1) : '0'

  const dl = priorRange.label
  const deltas = {
    leads:        makeDelta(cur.leads,          prev.leads,          dl),
    booked:       makeDelta(cur.booked,         prev.booked,         dl),
    showed:       makeDelta(cur.showed,         prev.showed,         dl),
    dealsClosed:  makeDelta(closedDealsInRange, prevClosedDealsInRange, dl),
    totalRevenue: makeDelta(totalRevenueInRange, prevTotalRevenue,    dl),
    cash:         makeDelta(cur.cash,           prev.cash,            dl),
  }

  // ── This Month at a Glance ──────────────────────────────────────────────────
  const monthWeeks = getMonthWeeks(currentYear, currentMonth, now)

  // GHL spend bucketed by week
  const ghlSpendByWeek: number[] = monthWeeks.map(({ start, end }) =>
    ghlAdSpend.daily.reduce((sum, d) => {
      const ms = Date.UTC(
        parseInt(d.date.slice(0, 4)),
        parseInt(d.date.slice(5, 7)) - 1,
        parseInt(d.date.slice(8, 10)),
      )
      return ms >= start && ms <= end ? sum + d.spend : sum
    }, 0)
  )

  const adSpendMtd = ghlAdSpend.totalSpend

  // MTD date bounds (still needed for mtdDealsWon below)
  const mtdStart = Date.UTC(currentYear, currentMonth, 1)
  const mtdEnd   = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())

  // MTD leads + booked + showed from CEO Dashboard sheet — same source as the weekly table
  // so the summary cards and table totals always agree.
  const mtdLeads  = ceoDash.weekly.reduce((sum, w) => sum + w.leads,  0)
  const mtdBooked = ceoDash.weekly.reduce((sum, w) => sum + w.booked, 0)
  const mtdShowed = ceoDash.weekly.reduce((sum, w) => sum + w.showed, 0)

  const costPerLead   = mtdLeads  > 0 ? adSpendMtd / mtdLeads  : 0
  const costPerBooked = mtdBooked > 0 ? adSpendMtd / mtdBooked : 0
  const mtdShowRate   = mtdBooked > 0 ? `${((mtdShowed / mtdBooked) * 100).toFixed(2)}%` : '0%'

  // MTD Deals Won from Closed Deals sheet
  const mtdDealsWon = closedDeals.filter((d) => {
    const ms = dateToMs(d.intakeDate)
    return ms >= mtdStart && ms <= mtdEnd
  }).length

  // ── Weekly table rows ───────────────────────────────────────────────────────
  const weeklyRows = ceoDash.weekly.map((w, i) => {
    const week = monthWeeks[i]

    // Deals Won + Revenue from Closed Deals sheet matched by intake date
    const weekDeals = week
      ? closedDeals.filter((d) => { const ms = dateToMs(d.intakeDate); return ms >= week.start && ms <= week.end })
      : []
    const dealsWon  = weekDeals.length
    const revenue   = weekDeals.reduce((sum, d) => sum + parseMoney(d.amount), 0)

    // Show rate computed live
    const sr = w.booked > 0 ? `${((w.showed / w.booked) * 100).toFixed(2)}%` : '0%'

    return {
      label:     w.period,
      adSpend:   ghlSpendByWeek[i] ?? 0,
      leads:     w.leads,
      booked:    w.booked,
      showed:    w.showed,
      noShows:   w.noShows,
      cancelled: w.cancelled,
      showRate:  sr,
      dealsWon,
      revenue,
    }
  })

  // Totals row
  const totals = weeklyRows.reduce(
    (acc, w) => ({
      adSpend:   acc.adSpend   + w.adSpend,
      leads:     acc.leads     + w.leads,
      booked:    acc.booked    + w.booked,
      showed:    acc.showed    + w.showed,
      noShows:   acc.noShows   + w.noShows,
      cancelled: acc.cancelled + w.cancelled,
      dealsWon:  acc.dealsWon  + w.dealsWon,
      revenue:   acc.revenue   + w.revenue,
    }),
    { adSpend: 0, leads: 0, booked: 0, showed: 0, noShows: 0, cancelled: 0, dealsWon: 0, revenue: 0 }
  )
  const totalsShowRate = totals.booked > 0 ? `${((totals.showed / totals.booked) * 100).toFixed(2)}%` : '0%'

  // ── Charts (full-year, ignores date range picker) ───────────────────────────
  const ytdRows = rows.filter((r) => { const d = splitDate(r.dateIn); return d && d.year === currentYear })
  const ytdWon  = ytdRows.filter((r) => r.callOutcome === 'WON')

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
    if (r.callOutcome === 'WON')   monthly[d.month].closed++
  }
  const monthlyData = Object.values(monthly).slice(0, currentMonth + 1)

  // Cash by source — from Closed Deals sheet (lead source field), YTD
  const ytdClosedDeals = closedDeals.filter((d) => {
    const parsed = splitDate(d.intakeDate)
    return parsed && parsed.year === currentYear
  })

  // Revenue by Closer — reuses closedCashByEmail built above
  const closerMapYtd: Record<string, { deals: number; revenue: number }> = {}
  for (const a of rows) {
    if (a.callOutcome !== 'WON') continue
    const d = splitDate(a.dateIn)
    if (!d || d.year !== currentYear) continue
    const name = a.closer?.trim() || 'Unknown'
    if (!closerMapYtd[name]) closerMapYtd[name] = { deals: 0, revenue: 0 }
    closerMapYtd[name].deals++
    const emailKey = a.email?.toLowerCase()
    const cash = emailKey && closedCashByEmail.has(emailKey)
      ? closedCashByEmail.get(emailKey)!
      : parseMoney(a.cashCollected)
    closerMapYtd[name].revenue += cash
  }
  const closerData = Object.entries(closerMapYtd)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([closer, v]) => ({ closer, deals: v.deals, revenue: v.revenue }))

  // Cash collected trend from Appointments (for cash trend chart)
  const cashTrend: CashTrendDataPoint[] = Array.from({ length: currentMonth + 1 }, (_, m) => ({
    month: MONTH_NAMES[m],
    cash: ytdWon
      .filter((r) => { const d = splitDate(r.callDate || r.dateIn); return d && d.month === m })
      .reduce((sum, r) => sum + parseMoney(r.cashCollected), 0),
  }))

  // Revenue trend from Closed Deals sheet by intake month
  const revTrend: RevenueTrendPoint[] = Array.from({ length: currentMonth + 1 }, (_, m) => {
    const monthDeals = ytdClosedDeals.filter((d) => {
      const parsed = splitDate(d.intakeDate)
      return parsed && parsed.month === m
    })
    const monthCash = ytdWon.filter((r) => {
      const d = splitDate(r.callDate || r.dateIn)
      return d && d.month === m
    })
    return {
      month:         MONTH_NAMES[m],
      revenue:       monthDeals.reduce((s, d) => s + parseMoney(d.amount), 0),
      deals:         monthDeals.length,
      cashCollected: monthCash.reduce((s, r) => s + parseMoney(r.cashCollected), 0),
    }
  })

  // Conversion funnel (YTD)
  const ytdLeads  = leadRows.filter((r) => { const d = splitDate(r.dateIn); return d && d.year === currentYear }).length
  const ytdBooked = (() => {
    const eligible = ytdRows.filter((r) => r.callStatus && r.callStatus.toLowerCase() !== 'rescheduled' && r.email)
    return new Set(eligible.map((r) => r.email.toLowerCase())).size
  })()
  const ytdShowed  = ytdRows.filter((r) => r.callStatus === 'Showed').length
  const ytdClosed  = ytdClosedDeals.length
  const funnelSteps = [
    { label: 'Leads',        value: ytdLeads,  color: '#94a3b8', pct: undefined },
    { label: 'Calls Booked', value: ytdBooked, color: '#0891b2', pct: ytdLeads  > 0 ? `${((ytdBooked / ytdLeads)  * 100).toFixed(1)}%` : undefined },
    { label: 'Calls Showed', value: ytdShowed, color: '#10b981', pct: ytdBooked > 0 ? `${((ytdShowed / ytdBooked) * 100).toFixed(1)}%` : undefined },
    { label: 'Deals Closed', value: ytdClosed, color: '#6366f1', pct: ytdShowed > 0 ? `${((ytdClosed / ytdShowed) * 100).toFixed(1)}%` : undefined },
  ]

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
  const pipelineRows    = ytdRows.filter((r) => PIPELINE_STAGES.includes(r.callOutcome))
  const pipelineCount   = pipelineRows.length
  const pipelineValue   = pipelineRows.reduce((sum, r) => sum + parseMoney(r.totalPrice), 0)
  const pipelineAvgDeal = pipelineCount > 0 ? pipelineValue / pipelineCount : 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Period Performance — section header with date filter */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Period Performance</h2>
          <p className="text-xs text-gray-400">Filtered by selected date range</p>
        </div>
        <Suspense>
          <DateRangePicker current={preset} />
        </Suspense>
      </div>

      {/* 6 KPI tiles — date-filter driven */}
      <div className="grid grid-cols-6 gap-3 mb-8">
        <KpiCard
          label="Leads"
          value={leads.toLocaleString()}
          sub={range.label}
          icon={Users}
          iconColor="text-teal-500"
          delta={deltas.leads}
        />
        <KpiCard
          label="Calls Booked"
          value={booked.toLocaleString()}
          sub={`${leads > 0 ? ((booked / leads) * 100).toFixed(1) : 0}% of leads`}
          icon={CalendarDays}
          iconColor="text-cyan-500"
          delta={deltas.booked}
        />
        <KpiCard
          label="Calls Showed"
          value={showed.toLocaleString()}
          sub={`${showRate}% show rate`}
          icon={Phone}
          iconColor="text-green-500"
          delta={deltas.showed}
        />
        <KpiCard
          label="Deals Closed"
          value={closedDealsInRange.toLocaleString()}
          sub={`${closeRateVal}% close rate`}
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          delta={deltas.dealsClosed}
        />
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenueInRange)}
          sub="All sources"
          icon={Trophy}
          iconColor="text-amber-500"
          delta={deltas.totalRevenue}
        />
        <KpiCard
          label="Cash Collected"
          value={fmt(cashCollected)}
          sub="All sources"
          icon={DollarSign}
          iconColor="text-blue-500"
          delta={deltas.cash}
        />
      </div>

      {/* This Month at a Glance */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">This Month at a Glance</h2>
        <p className="text-sm text-gray-400 mb-4">{currentMonthName} {currentYear}</p>

        {/* 5 MTD tiles */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          <KpiCard compact label="Ad Spend (MTD)"  value={fmt(adSpendMtd)}            sub={`${currentMonthName} ${currentYear}`} icon={DollarSign}  iconColor="text-blue-500"    valueColor="text-blue-600" />
          <KpiCard compact label="Cost / Lead"     value={fmt(costPerLead)}            sub={`${mtdLeads} leads`}                  icon={DollarSign}  iconColor="text-teal-500"    valueColor="text-teal-600" />
          <KpiCard compact label="Cost / Booked"   value={fmt(costPerBooked)}          sub={`${mtdBooked} booked`}                icon={DollarSign}  iconColor="text-cyan-500"    valueColor="text-cyan-600" />
          <KpiCard compact label="Show Rate"       value={mtdShowRate}                 sub="Showed ÷ Booked"                      icon={TrendingUp}  iconColor="text-emerald-500" valueColor="text-emerald-600" />
          <KpiCard compact label="Deals Won"       value={mtdDealsWon.toLocaleString()} sub={`${currentMonthName} ${currentYear}`} icon={Trophy}      iconColor="text-amber-500"   valueColor="text-amber-600" />
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
                <td className="py-2 text-right">{w.adSpend > 0 ? <span className="text-gray-700">{fmt(w.adSpend)}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{w.leads > 0 ? <span className="text-gray-700">{w.leads}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{w.booked > 0 ? <span className="text-gray-700">{w.booked}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{w.showed > 0 ? <span className="text-gray-700">{w.showed}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{w.noShows > 0 ? <span className="text-gray-700">{w.noShows}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{w.cancelled > 0 ? <span className="text-gray-700">{w.cancelled}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{w.booked > 0 ? <span className="text-gray-700">{w.showRate}</span> : <span className="text-gray-300">0%</span>}</td>
                <td className="py-2 text-right">{w.dealsWon > 0 ? <span className="text-gray-700">{w.dealsWon}</span> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2 text-right">{w.revenue > 0 ? <span className="text-gray-700">{fmt(w.revenue)}</span> : <span className="text-gray-300">0</span>}</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="py-2.5 font-semibold text-gray-700 text-xs">Total</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">{totals.adSpend > 0 ? fmt(totals.adSpend) : '—'}</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">{totals.leads}</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">{totals.booked}</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">{totals.showed}</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">{totals.noShows}</td>
              <td className="py-2.5 text-right font-semibold text-gray-700">{totals.cancelled}</td>
              <td className="py-2.5 text-right font-semibold text-gray-700">{totalsShowRate}</td>
              <td className="py-2.5 text-right font-semibold">{totals.dealsWon > 0 ? <span className="text-gray-900">{totals.dealsWon}</span> : <span className="text-gray-300">0</span>}</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">{totals.revenue > 0 ? fmt(totals.revenue) : <span className="text-gray-300">0</span>}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Monthly performance — full width */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Monthly performance</h2>
        <p className="text-sm text-gray-400 mb-4">January–{currentMonthName} {currentYear} — leads, booked, showed + show rate</p>
        <MonthlyChart data={monthlyData} />
      </div>

      {/* Deals & Revenue by Month + Revenue by Closer */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Deals &amp; Revenue by Month</h2>
          <p className="text-sm text-gray-400 mb-4">Deals closed · revenue contracted vs cash received</p>
          <RevenueTrendChart data={revTrend} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Revenue by Closer</h2>
          <p className="text-sm text-gray-400 mb-3">January–{currentMonthName} {currentYear} · cash collected per closer</p>
          <CloserRevenueChart data={closerData} />
        </div>
      </div>

      {/* Lead quality trend + Conversion funnel */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Lead quality trend</h2>
          <p className="text-sm text-gray-400 mb-4">January–{currentMonthName} {currentYear} — Good (High Value + Qualified) vs Bad (Bad Lead + Low Quality)</p>
          <LeadQualityChart data={qualityData} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Conversion funnel</h2>
          <p className="text-sm text-gray-400 mb-4">YTD — step-by-step conversion</p>
          <ConversionFunnel steps={funnelSteps} />
        </div>
      </div>
    </div>
  )
}
