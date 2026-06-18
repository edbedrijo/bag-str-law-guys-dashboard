export const dynamic = 'force-dynamic'

import { getAppointments } from '@/lib/sheets'
import PageHeader from '@/components/PageHeader'
import KpiCard from '@/components/KpiCard'
import type { AppointmentRow } from '@/types/appointments'
import { Trophy, DollarSign, Users2, Clock } from 'lucide-react'

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function splitDate(dateStr: string) {
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SOURCE_COLORS: Record<string, string> = {
  Paid: 'bg-blue-100 text-blue-700 border border-blue-200',
  Referral: 'bg-orange-100 text-orange-700 border border-orange-200',
  Organic: 'bg-green-100 text-green-700 border border-green-200',
}

export default async function ClosedDealsPage() {
  const rows = await getAppointments()
  const currentYear = new Date().getFullYear()

  const won = rows.filter((r) => {
    if (r.callOutcome !== 'WON') return false
    const d = splitDate(r.callDate || r.dateIn)
    return d && d.year === currentYear
  })

  const totalCash = won.reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)
  const referralCash = won.filter((r) => classifySource(r) === 'Referral').reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)

  // Avg days to paid
  let totalDays = 0
  let dayCount = 0
  for (const r of won) {
    const di = splitDate(r.dateIn)
    const dc = splitDate(r.callDate)
    if (di && dc) {
      const msPerDay = 1000 * 60 * 60 * 24
      const diff = Math.round((Date.UTC(dc.year, dc.month, dc.day) - Date.UTC(di.year, di.month, di.day)) / msPerDay)
      if (diff >= 0) { totalDays += diff; dayCount++ }
    }
  }
  const avgDays = dayCount > 0 ? (totalDays / dayCount).toFixed(1) : '0'

  // Monthly by source
  const monthlyMap: Record<number, { Paid: number; Referral: number; Organic: number }> = {}
  for (let m = 0; m < 12; m++) monthlyMap[m] = { Paid: 0, Referral: 0, Organic: 0 }

  for (const r of won) {
    const d = splitDate(r.callDate || r.dateIn)
    if (!d) continue
    const src = classifySource(r)
    monthlyMap[d.month][src] += parseMoney(r.cashCollected)
  }

  const currentMonth = new Date().getMonth()
  const monthlyRows = Object.entries(monthlyMap)
    .slice(0, currentMonth + 1)
    .filter(([, v]) => v.Paid > 0 || v.Referral > 0 || v.Organic > 0)
    .map(([m, v]) => ({
      month: `${MONTH_NAMES[parseInt(m)]} '${String(currentYear).slice(2)}`,
      paid: v.Paid,
      referral: v.Referral,
      organic: v.Organic,
      total: v.Paid + v.Referral + v.Organic,
    }))

  // Deals list sorted by callDate
  const dealsList = [...won]
    .sort((a, b) => {
      const da = splitDate(a.callDate || a.dateIn)
      const db = splitDate(b.callDate || b.dateIn)
      if (!da || !db) return 0
      return Date.UTC(da.year, da.month, da.day) - Date.UTC(db.year, db.month, db.day)
    })
    .map((r) => {
      const d = splitDate(r.callDate || r.dateIn)
      return {
        name: `${r.firstName} ${r.lastName}`.trim() || r.contactId,
        month: d ? `${MONTH_NAMES[d.month]} '${String(currentYear).slice(2)}` : '—',
        source: classifySource(r),
        cash: parseMoney(r.cashCollected),
      }
    })

  const fmtCash = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmtCash(n)

  return (
    <div>
      <PageHeader title="Closed Deals" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Sales" value={won.length} sub="Closed deals" icon={Trophy} iconColor="text-amber-500" />
        <KpiCard label="Total Cash" value={fmtK(totalCash)} sub="All sources" icon={DollarSign} iconColor="text-blue-500" />
        <KpiCard
          label="Referral Cash"
          value={fmtK(referralCash)}
          sub={`${totalCash > 0 ? ((referralCash / totalCash) * 100).toFixed(1) : 0}% of total`}
          icon={Users2}
          iconColor="text-orange-500"
        />
        <KpiCard label="Avg Days to Paid" value={`${avgDays}d`} sub="Strategy mtg → paid" icon={Clock} iconColor="text-gray-400" />
      </div>

      {/* Monthly by source */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Total sales by month and source</h2>
        <p className="text-sm text-gray-400 mb-4">Cash collected — which source drives revenue</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-400 font-medium">Month</th>
              <th className="text-right py-2 text-gray-400 font-medium">Paid</th>
              <th className="text-right py-2 text-gray-400 font-medium">Referral</th>
              <th className="text-right py-2 text-gray-400 font-medium">Organic</th>
              <th className="text-right py-2 text-gray-400 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row) => (
              <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5 text-gray-900 font-medium">{row.month}</td>
                <td className="py-2.5 text-right text-gray-700">{row.paid > 0 ? fmtCash(row.paid) : '—'}</td>
                <td className="py-2.5 text-right text-gray-700">{row.referral > 0 ? fmtCash(row.referral) : '—'}</td>
                <td className="py-2.5 text-right text-gray-700">{row.organic > 0 ? fmtCash(row.organic) : '—'}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{fmtCash(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Closed deals list */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Closed deals</h2>
        <p className="text-sm text-gray-400 mb-4">Every won deal, sorted by close date</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-400 font-medium">Client</th>
              <th className="text-right py-2 text-gray-400 font-medium">Month</th>
              <th className="text-right py-2 text-gray-400 font-medium">Source</th>
              <th className="text-right py-2 text-gray-400 font-medium">Cash</th>
            </tr>
          </thead>
          <tbody>
            {dealsList.map((deal, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5 text-gray-900 font-medium">{deal.name}</td>
                <td className="py-2.5 text-right text-gray-500">{deal.month}</td>
                <td className="py-2.5 text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[deal.source]}`}>
                    • {deal.source}
                  </span>
                </td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{fmtCash(deal.cash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
