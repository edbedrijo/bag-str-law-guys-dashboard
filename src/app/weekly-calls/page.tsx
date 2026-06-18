export const dynamic = 'force-dynamic'

import { getAppointments } from '@/lib/sheets'
import PageHeader from '@/components/PageHeader'
import WeeklyCallsChart from '@/components/WeeklyCallsChart'
import type { AppointmentRow } from '@/types/appointments'

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

function getWeekLabel(d: { year: number; month: number; day: number }): string {
  const date = new Date(Date.UTC(d.year, d.month, d.day))
  const day = date.getUTCDay()
  const mondayMs = date.getTime() - (day === 0 ? 6 : day - 1) * 86400000
  const monday = new Date(mondayMs)
  const sunday = new Date(mondayMs + 6 * 86400000)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTHS[monday.getUTCMonth()]} ${monday.getUTCDate()}–${sunday.getUTCDate()}`
}

export default async function WeeklyCallsPage() {
  const rows = await getAppointments()
  const currentYear = new Date().getFullYear()

  const filtered = rows.filter((r) => {
    if (!r.callStatus || r.callStatus === '') return false
    const d = splitDate(r.callDate || r.dateIn)
    return d && d.year === currentYear
  })

  // Group by week
  const weekMap: Record<string, { label: string; Paid: number; Referral: number; Organic: number; sortKey: string }> = {}

  for (const r of filtered) {
    const d = splitDate(r.callDate || r.dateIn)
    if (!d) continue
    const label = getWeekLabel(d)
    const sortKey = `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
    if (!weekMap[label]) weekMap[label] = { label, Paid: 0, Referral: 0, Organic: 0, sortKey }
    const src = classifySource(r)
    weekMap[label][src]++
  }

  const weeks = Object.values(weekMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  const chartData = weeks.map(({ label, Paid, Referral, Organic }) => ({ label, Paid, Referral, Organic }))

  return (
    <div>
      <PageHeader title="Weekly Calls" />

      <WeeklyCallsChart data={chartData} />

      {/* Weekly detail table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Weekly detail</h2>
        <p className="text-sm text-gray-400 mb-4">Sorted by call date (most recent last)</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-400 font-medium">Week</th>
              <th className="text-right py-2 text-gray-400 font-medium">Paid</th>
              <th className="text-right py-2 text-gray-400 font-medium">Referral</th>
              <th className="text-right py-2 text-gray-400 font-medium">Organic</th>
              <th className="text-right py-2 text-gray-400 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const total = w.Paid + w.Referral + w.Organic
              return (
                <tr key={w.label} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 text-teal-600 font-medium">{w.label}</td>
                  <td className="py-2.5 text-right text-gray-700">{w.Paid}</td>
                  <td className="py-2.5 text-right text-gray-700">{w.Referral}</td>
                  <td className="py-2.5 text-right text-gray-700">{w.Organic}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-900">{total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
