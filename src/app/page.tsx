export const dynamic = 'force-dynamic'

import { getLeads, getAppointments, getCeoDashboardAdSpend } from '@/lib/sheets'
import KpiCard from '@/components/KpiCard'
import MonthlyChart from '@/components/MonthlyChart'
import PageHeader from '@/components/PageHeader'
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

function computeKpis(leadRows: LeadRow[], rows: AppointmentRow[]) {
  const currentYear = new Date().getFullYear()

  const filteredLeads = leadRows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === currentYear
  })
  const leads = filteredLeads.length

  const filtered = rows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === currentYear
  })
  const booked = filtered.filter((r) => r.callStatus && r.callStatus !== '').length
  const showed = filtered.filter((r) => r.callStatus === 'Showed').length
  const won = filtered.filter((r) => r.callOutcome === 'WON')
  const closed = won.length
  const cashCollected = won.reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)

  let totalDays = 0
  let dayCount = 0
  for (const r of won) {
    const di = splitDate(r.dateIn)
    const dc = splitDate(r.callDate)
    if (di && dc) {
      const msPerDay = 1000 * 60 * 60 * 24
      const inMs = Date.UTC(di.year, di.month, di.day)
      const callMs = Date.UTC(dc.year, dc.month, dc.day)
      const diff = Math.round((callMs - inMs) / msPerDay)
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
  const currentMonth = new Date().getMonth()
  const monthlyData = Object.values(monthly).slice(0, currentMonth + 1)

  // Cash by source
  const cashBySource: Record<string, number> = { Paid: 0, Referral: 0, Organic: 0 }
  for (const r of won) {
    const src = classifySource(r)
    cashBySource[src] += parseMoney(r.cashCollected)
  }

  return { leads, booked, showed, closed, cashCollected, avgDaysToPaid, monthlyData, cashBySource }
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

  const { leads, booked, showed, closed, cashCollected, avgDaysToPaid, monthlyData, cashBySource } = computeKpis(leadRows, rows)

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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Leads"
          value={leads.toLocaleString()}
          sub={`Jan–${currentMonthName} ${currentYear}`}
          icon={Users}
          iconColor="text-teal-500"
        />
        <KpiCard
          label="Calls Booked"
          value={booked.toLocaleString()}
          sub={`${((booked / leads) * 100).toFixed(1)}% of leads`}
          icon={CalendarDays}
          iconColor="text-cyan-500"
        />
        <KpiCard
          label="Qualified Calls"
          value={showed.toLocaleString()}
          sub={`${showRate}% show rate`}
          icon={Phone}
          iconColor="text-green-500"
        />
        <KpiCard
          label="Deals Closed"
          value={closed.toLocaleString()}
          sub={`${closeRate}% close rate`}
          icon={CheckCircle2}
          iconColor="text-emerald-500"
        />
        <KpiCard
          label="Cash Collected"
          value={fmt(cashCollected)}
          sub="All sources"
          icon={DollarSign}
          iconColor="text-blue-500"
        />
        <KpiCard
          label="Avg Days to Paid"
          value={`${avgDaysToPaid}d`}
          sub="Strategy mtg → paid"
          icon={Clock}
          iconColor="text-gray-400"
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

      {/* Monthly performance chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Monthly performance</h2>
        <p className="text-sm text-gray-400 mb-4">Leads, booked calls, qualified (held) calls and closed deals</p>
        <MonthlyChart data={monthlyData} />
      </div>

      {/* Cash by source */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Cash by source</h2>
        <p className="text-sm text-gray-400 mb-4">Where revenue actually comes from</p>
        <div className="space-y-3 mt-4">
          {[
            { label: 'Referral', color: 'bg-orange-400', amount: cashBySource.Referral },
            { label: 'Paid',     color: 'bg-blue-400',   amount: cashBySource.Paid },
            { label: 'Organic',  color: 'bg-green-400',  amount: cashBySource.Organic },
          ].map(({ label, color, amount }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-sm font-medium text-gray-600">{label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{fmt(amount)}</span>
                <span className="text-sm text-gray-400 w-10 text-right">
                  {totalCash > 0 ? `${((amount / totalCash) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
