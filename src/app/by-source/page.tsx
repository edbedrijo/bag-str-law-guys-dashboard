export const dynamic = 'force-dynamic'

import { getAppointments } from '@/lib/sheets'
import PageHeader from '@/components/PageHeader'
import BySourceCharts from '@/components/BySourceCharts'
import type { AppointmentRow } from '@/types/appointments'

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function splitDate(dateStr: string) {
  if (!dateStr) return null
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length < 3) return null
  if (parts[0].length === 4) return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1 }
  return { year: parseInt(parts[2]), month: parseInt(parts[0]) - 1 }
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

export default async function BySourcePage() {
  const rows = await getAppointments()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const filtered = rows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === currentYear
  })

  // Build monthly data by source
  const sources = ['Paid', 'Referral', 'Organic'] as const
  const monthlyBooked: Record<string, Record<string, number>> = {}
  const monthlyCash: Record<string, Record<string, number>> = {}

  for (let m = 0; m <= currentMonth; m++) {
    const key = MONTH_NAMES[m]
    monthlyBooked[key] = { Paid: 0, Referral: 0, Organic: 0 }
    monthlyCash[key] = { Paid: 0, Referral: 0, Organic: 0 }
  }

  for (const r of filtered) {
    const d = splitDate(r.dateIn)
    if (!d || d.month > currentMonth) continue
    const key = MONTH_NAMES[d.month]
    const src = classifySource(r)
    if (r.callStatus && r.callStatus !== '') monthlyBooked[key][src]++
    if (r.callOutcome === 'WON') monthlyCash[key][src] += parseMoney(r.cashCollected)
  }

  const bookedChartData = Object.entries(monthlyBooked).map(([month, vals]) => ({
    month,
    Paid: vals.Paid,
    Referral: vals.Referral,
    Organic: vals.Organic,
  }))
  const cashChartData = Object.entries(monthlyCash).map(([month, vals]) => ({
    month,
    Paid: vals.Paid,
    Referral: vals.Referral,
    Organic: vals.Organic,
  }))

  // Scorecard
  const scorecard = sources.map((src) => {
    const srcRows = filtered.filter((r) => classifySource(r) === src)
    const booked = srcRows.filter((r) => r.callStatus && r.callStatus !== '').length
    const qual   = srcRows.filter((r) => r.callStatus === 'Showed').length
    const won    = srcRows.filter((r) => r.callOutcome === 'WON')
    const closed = won.length
    const cash   = won.reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)
    const totalCash = filtered.filter((r) => r.callOutcome === 'WON').reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)
    return { src, booked, qualified: qual, closed, cash, pctCash: totalCash > 0 ? `${((cash / totalCash) * 100).toFixed(1)}%` : '0%' }
  })

  const fmtCash = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div>
      <PageHeader title="By Source" />

      <BySourceCharts bookedData={bookedChartData} cashData={cashChartData} />

      {/* Source scorecard */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Source scorecard</h2>
        <p className="text-sm text-gray-400 mb-4">Full breakout across the funnel + cash</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-400 font-medium">Source</th>
              <th className="text-right py-2 text-gray-400 font-medium">Booked</th>
              <th className="text-right py-2 text-gray-400 font-medium">Qualified</th>
              <th className="text-right py-2 text-gray-400 font-medium">Closed</th>
              <th className="text-right py-2 text-gray-400 font-medium">Cash</th>
              <th className="text-right py-2 text-gray-400 font-medium">% of cash</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.map((row) => (
              <tr key={row.src} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[row.src]}`}>
                    • {row.src}
                  </span>
                </td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{row.booked}</td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{row.qualified}</td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{row.closed}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{fmtCash(row.cash)}</td>
                <td className="py-2.5 text-right text-gray-500">{row.pctCash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
