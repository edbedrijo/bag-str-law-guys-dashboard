export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getClosedDeals } from '@/lib/sheets'
import PageHeader from '@/components/PageHeader'
import KpiCard from '@/components/KpiCard'
import SortHeader from './SortHeader'
import ClosedDealsCharts from './ClosedDealsCharts'
import { AddDealButton, EditDealButton } from './DealModal'
import { Trophy, DollarSign } from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function parseDate(val: string): number {
  if (!val) return 0
  const parts = val.split(/[\/\-]/)
  if (parts.length < 3) return 0
  if (parts[0].length <= 2) return parseInt(parts[2]) * 10000 + parseInt(parts[0]) * 100 + parseInt(parts[1])
  return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2])
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

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  return raw  // return as-is if it doesn't match expected length
}

const SOURCE_COLORS_CSS: Record<string, string> = {
  website:  'bg-blue-50 text-blue-700 border border-blue-200',
  ghl:      'bg-purple-50 text-purple-700 border border-purple-200',
  referral: 'bg-orange-50 text-orange-700 border border-orange-200',
  paid:     'bg-cyan-50 text-cyan-700 border border-cyan-200',
}

function sourceChip(src: string) {
  if (!src) return null
  const key = Object.keys(SOURCE_COLORS_CSS).find((k) => src.toLowerCase().includes(k)) ?? ''
  const cls = SOURCE_COLORS_CSS[key] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{src}</span>
}

export default async function ClosedDealsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>
}) {
  const sp   = await searchParams
  const sort = sp.sort ?? 'date'
  const dir  = sp.dir  ?? 'asc'

  const raw = await getClosedDeals()

  // ── KPI totals ──────────────────────────────────────────────────────────────
  const totalRevenue = raw.reduce((sum, d) => sum + parseMoney(d.amount), 0)
  const totalDeals   = raw.length

  // ── Monthly breakdown ───────────────────────────────────────────────────────
  const monthlyMap: Record<number, { deals: number; revenue: number }> = {}
  for (let m = 0; m < 12; m++) monthlyMap[m] = { deals: 0, revenue: 0 }
  for (const d of raw) {
    const m = getMonth(d.intakeDate)
    if (m >= 0) {
      monthlyMap[m].deals++
      monthlyMap[m].revenue += parseMoney(d.amount)
    }
  }
  const currentMonth = new Date().getMonth()
  const monthly = Array.from({ length: currentMonth + 1 }, (_, m) => ({
    month:   MONTH_NAMES[m],
    deals:   monthlyMap[m].deals,
    revenue: monthlyMap[m].revenue,
  }))

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

  // ── Sorted deal list ────────────────────────────────────────────────────────
  const deals = [...raw].sort((a, b) => {
    let diff = 0
    if (sort === 'amount') diff = parseMoney(a.amount) - parseMoney(b.amount)
    else                   diff = parseDate(a.intakeDate) - parseDate(b.intakeDate)
    return dir === 'desc' ? -diff : diff
  })

  return (
    <>
      <PageHeader title="Closed Deals" />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiCard label="Total Revenue" value={fmt(totalRevenue)} icon={DollarSign} iconColor="text-blue-500" />
        <KpiCard label="Total Deals"   value={totalDeals}         icon={Trophy}     iconColor="text-amber-500" />
      </div>

      {/* Charts */}
      <div className="mb-2">
        <ClosedDealsCharts monthly={monthly} bySource={bySource} byMatter={byMatter} />
      </div>

      {/* Scroll hint */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4 select-none">
        <span>↓</span>
        <span>Scroll down to view all {totalDeals} closed deals</span>
        <span>↓</span>
      </div>

      {/* Deal table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-gray-900">Closed Deals</h2>
          <p className="text-sm text-gray-400">Every won deal</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-gray-100">
                <th className="text-left px-5 py-2.5 text-gray-400 font-medium w-[22%]">Client Name</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-[18%]">Email</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-[10%]">Phone</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-[14%]">Matter Type</th>
                <th className="text-left px-4 py-2.5 w-[9%]">
                  <Suspense fallback={<span className="text-gray-400 font-medium">Date</span>}>
                    <SortHeader label="Date" field="date" />
                  </Suspense>
                </th>
                <th className="text-right px-4 py-2.5 w-[9%]">
                  <Suspense fallback={<span className="text-gray-400 font-medium">Amount</span>}>
                    <SortHeader label="Amount" field="amount" />
                  </Suspense>
                </th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-[10%]">Referred By</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-[8%]">Lead Source</th>
                <th className="px-4 py-2.5 w-[4%]" />
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-2.5 text-gray-900 font-medium">{deal.clientName || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 truncate max-w-[180px]">{deal.email || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{deal.phone ? formatPhone(deal.phone) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{deal.matterType || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{deal.intakeDate || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {parseMoney(deal.amount) > 0 ? fmt(parseMoney(deal.amount)) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{deal.referredBy || '—'}</td>
                  <td className="px-4 py-2.5">{sourceChip(deal.leadSource)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <EditDealButton rowIndex={i} deal={{
                      clientName: deal.clientName, email: deal.email, phone: deal.phone,
                      matterType: deal.matterType, intakeDate: deal.intakeDate, amount: deal.amount,
                      referredBy: deal.referredBy, leadSource: deal.leadSource,
                    }} />
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-400">No closed deals found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">
          {deals.length} deal{deals.length !== 1 ? 's' : ''}
        </div>
      </div>

      <AddDealButton />
    </>
  )
}
