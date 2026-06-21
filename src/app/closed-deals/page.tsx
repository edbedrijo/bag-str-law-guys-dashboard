export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getClosedDeals, getAppointments } from '@/lib/sheets'
import PageHeader from '@/components/PageHeader'
import KpiCard from '@/components/KpiCard'
import ClosedDealsCharts from './ClosedDealsCharts'
import ClosedDealsTable from './ClosedDealsTable'
import { AddDealButton, type DealOptions } from './DealModal'
import { Trophy, DollarSign } from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function getMonth(val: string): number {
  if (!val) return -1
  const parts = val.split(/[\/\-]/)
  if (parts.length < 3) return -1
  if (parts[0].length <= 2) return parseInt(parts[0]) - 1
  return parseInt(parts[1]) - 1
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}


export default async function ClosedDealsPage() {
  const [raw, appts] = await Promise.all([getClosedDeals(), getAppointments()])

  // ── Cash Collected — dual source, deduped by email ──────────────────────────
  // Iterate WON appointments (the complete record); for each, use the Closed Deals
  // sheet cash if that email has a non-zero entry there, else use Appointments cash.
  // This matches the Overview methodology so both pages show the same total.
  const closedCashByEmail = new Map(
    raw
      .filter((d) => d.email && parseMoney(d.cashCollected) > 0)
      .map((d) => [d.email.toLowerCase(), parseMoney(d.cashCollected)])
  )
  const totalCashCollected = appts
    .filter((a) => a.callOutcome === 'WON')
    .reduce((sum, a) => {
      const emailKey = a.email?.toLowerCase()
      const cash = emailKey && closedCashByEmail.has(emailKey)
        ? closedCashByEmail.get(emailKey)!
        : parseMoney(a.cashCollected)
      return sum + cash
    }, 0)

  // ── KPI totals ──────────────────────────────────────────────────────────────
  const totalRevenue = raw.reduce((sum, d) => sum + parseMoney(d.amount), 0)
  const totalDeals   = raw.length

  // Unique dropdown options derived from existing data (sorted, blanks excluded)
  const unique = (fn: (d: typeof raw[0]) => string) =>
    [...new Set(raw.map(fn).filter(Boolean))].sort()

  const dealOptions: DealOptions = {
    matterTypes: unique((d) => d.matterType),
    referredBys: unique((d) => d.referredBy),
    leadSources: unique((d) => d.leadSource),
  }

  // ── Monthly breakdown ───────────────────────────────────────────────────────
  const monthlyMap: Record<number, { deals: number; revenue: number; cash: number }> = {}
  for (let m = 0; m < 12; m++) monthlyMap[m] = { deals: 0, revenue: 0, cash: 0 }
  for (const d of raw) {
    const m = getMonth(d.intakeDate)
    if (m >= 0) {
      monthlyMap[m].deals++
      monthlyMap[m].revenue += parseMoney(d.amount)
    }
  }
  // Cash by month: iterate WON appointments (same dual-source logic as totalCashCollected)
  for (const a of appts) {
    if (a.callOutcome !== 'WON') continue
    const m = getMonth(a.callDate || a.dateIn)
    if (m < 0 || m >= 12) continue
    const emailKey = a.email?.toLowerCase()
    const cash = emailKey && closedCashByEmail.has(emailKey)
      ? closedCashByEmail.get(emailKey)!
      : parseMoney(a.cashCollected)
    monthlyMap[m].cash += cash
  }
  const currentMonth = new Date().getMonth()
  const monthly = Array.from({ length: currentMonth + 1 }, (_, m) => ({
    month:   MONTH_NAMES[m],
    deals:   monthlyMap[m].deals,
    revenue: monthlyMap[m].revenue,
    cash:    monthlyMap[m].cash,
  }))

  // ── By Closer ───────────────────────────────────────────────────────────────
  const closerMap: Record<string, { deals: number; revenue: number }> = {}
  for (const a of appts) {
    if (a.callOutcome !== 'WON') continue
    const name = a.closer?.trim() || 'Unknown'
    if (!closerMap[name]) closerMap[name] = { deals: 0, revenue: 0 }
    closerMap[name].deals++
    // Use Closed Deals cash if available for this email, else fall back to Appointments
    const emailKey = a.email?.toLowerCase()
    const cash = emailKey && closedCashByEmail.has(emailKey)
      ? closedCashByEmail.get(emailKey)!
      : parseMoney(a.cashCollected)
    closerMap[name].revenue += cash
  }
  const byCloser = Object.entries(closerMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([closer, v]) => ({ closer, deals: v.deals, revenue: v.revenue }))

  // ── By lead source ──────────────────────────────────────────────────────────
  const sourceMap: Record<string, { deals: number; revenue: number }> = {}
  for (const d of raw) {
    const key = d.leadSource?.trim() || 'Unknown'
    if (!sourceMap[key]) sourceMap[key] = { deals: 0, revenue: 0 }
    sourceMap[key].deals++
    sourceMap[key].revenue += parseMoney(d.amount)
  }
  const bySource = Object.entries(sourceMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([source, v]) => ({
      source,
      deals:   v.deals,
      revenue: v.revenue,
      pct:     totalRevenue > 0 ? `${((v.revenue / totalRevenue) * 100).toFixed(1)}%` : '0%',
    }))

  // ── By matter type ──────────────────────────────────────────────────────────
  const matterMap: Record<string, { deals: number; revenue: number }> = {}
  for (const d of raw) {
    const key = d.matterType?.trim() || 'Unknown'
    if (!matterMap[key]) matterMap[key] = { deals: 0, revenue: 0 }
    matterMap[key].deals++
    matterMap[key].revenue += parseMoney(d.amount)
  }
  const byMatter = Object.entries(matterMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([type, v]) => ({ type, deals: v.deals, revenue: v.revenue }))

  return (
    <>
      <PageHeader title="Closed Deals" />

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total Revenue"       value={fmt(totalRevenue)}       icon={DollarSign} iconColor="text-blue-500" />
        <KpiCard label="Cash Collected"      value={fmt(totalCashCollected)} icon={DollarSign} iconColor="text-emerald-500" />
        <KpiCard label="Total Deals"         value={totalDeals}              icon={Trophy}     iconColor="text-amber-500" />
      </div>

      {/* Charts */}
      <div className="mb-2">
        <ClosedDealsCharts monthly={monthly} bySource={bySource} byMatter={byMatter} byCloser={byCloser} />
      </div>

      {/* Scroll hint */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4 select-none">
        <span>↓</span>
        <span>Scroll down to view all {totalDeals} closed deals</span>
        <span>↓</span>
      </div>

      {/* Deal table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Closed Deals</h2>
            <p className="text-sm text-gray-400">Every won deal</p>
          </div>
          <p className="text-xs text-gray-300 mt-1 text-right leading-relaxed">
            Drag headers to reorder<br />Drag right edge to resize
          </p>
        </div>
        <Suspense fallback={<div className="px-5 py-10 text-center text-gray-400 text-sm">Loading deals…</div>}>
          <ClosedDealsTable deals={raw} options={dealOptions} />
        </Suspense>
      </div>

      <AddDealButton options={dealOptions} />
    </>
  )
}
