export const dynamic = 'force-dynamic'

import { getAppointments } from '@/lib/sheets'
import PageHeader from '@/components/PageHeader'
import type { AppointmentRow } from '@/types/appointments'

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function splitDate(dateStr: string) {
  if (!dateStr) return null
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length < 3) return null
  if (parts[0].length === 4) return { year: parseInt(parts[0]) }
  return { year: parseInt(parts[2]) }
}

function classifySource(row: AppointmentRow): 'Paid' | 'Referral' | 'Organic' {
  const src = (row.trafficSource || '').toLowerCase()
  if (src.includes('paid') || src.includes('facebook') || src.includes('fb')) return 'Paid'
  if (src.includes('referral') || src.includes('ref')) return 'Referral'
  return 'Organic'
}

const SOURCE_COLORS: Record<string, string> = {
  Paid: 'bg-blue-100 text-blue-700 border border-blue-200',
  Referral: 'bg-orange-100 text-orange-700 border border-orange-200',
  Organic: 'bg-green-100 text-green-700 border border-green-200',
}

export default async function FunnelPage() {
  const rows = await getAppointments()
  const currentYear = new Date().getFullYear()
  const filtered = rows.filter((r) => {
    const d = splitDate(r.dateIn)
    return d && d.year === currentYear
  })

  const leads = filtered.length
  const booked = filtered.filter((r) => r.callStatus && r.callStatus !== '').length
  const showed = filtered.filter((r) => r.callStatus === 'Showed').length
  const won = filtered.filter((r) => r.callOutcome === 'WON')
  const closed = won.length
  const totalCash = won.reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)

  const funnel = [
    { label: 'Leads',                 value: leads,   color: 'bg-gray-500',   pct: null },
    { label: 'Calls Booked',          value: booked,  color: 'bg-cyan-500',   pct: leads  > 0 ? ((booked / leads)  * 100).toFixed(1) : '0' },
    { label: 'Qualified (Held) Calls', value: showed, color: 'bg-green-500',  pct: booked > 0 ? ((showed / booked) * 100).toFixed(1) : '0' },
    { label: 'Deals Closed',          value: closed,  color: 'bg-amber-400',  pct: showed > 0 ? ((closed / showed) * 100).toFixed(1) : '0' },
  ]

  const sources = ['Paid', 'Referral', 'Organic'] as const
  const bySource = sources.map((src) => {
    const srcRows = filtered.filter((r) => classifySource(r) === src)
    const srcBooked = srcRows.filter((r) => r.callStatus && r.callStatus !== '').length
    const srcQual   = srcRows.filter((r) => r.callStatus === 'Showed').length
    const srcWon    = srcRows.filter((r) => r.callOutcome === 'WON')
    const srcClosed = srcWon.length
    const srcCash   = srcWon.reduce((sum, r) => sum + parseMoney(r.cashCollected), 0)
    return {
      src,
      booked: srcBooked,
      qualified: srcQual,
      closed: srcClosed,
      showRate: srcBooked > 0 ? `${((srcQual / srcBooked) * 100).toFixed(1)}%` : '—',
      closeRate: srcQual  > 0 ? `${((srcClosed / srcQual) * 100).toFixed(1)}%` : '—',
      cash: srcCash.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    }
  })

  const fmtCash = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div>
      <PageHeader title="Funnel" />

      {/* Conversion funnel */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Conversion funnel</h2>
        <p className="text-sm text-gray-400 mb-6">
          Deduped to one record per contact. Qualified = held strategy calls (excludes cancels, no-shows, duplicates).
        </p>
        <div className="space-y-4">
          {funnel.map((step) => (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{step.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{step.value.toLocaleString()}</span>
                  {step.pct && (
                    <span className="text-xs font-medium text-amber-600">{step.pct}% step</span>
                  )}
                </div>
              </div>
              <div className="h-8 w-full rounded bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded ${step.color}`}
                  style={{ width: `${leads > 0 ? Math.max((step.value / leads) * 100, 2) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel by source */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Funnel by source</h2>
        <p className="text-sm text-gray-400 mb-4">Booked → Qualified → Closed, split by Paid / Referral / Organic</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-400 font-medium">Source</th>
              <th className="text-right py-2 text-gray-400 font-medium">Booked</th>
              <th className="text-right py-2 text-gray-400 font-medium">Qualified</th>
              <th className="text-right py-2 text-gray-400 font-medium">Closed</th>
              <th className="text-right py-2 text-gray-400 font-medium">Show rate</th>
              <th className="text-right py-2 text-gray-400 font-medium">Close rate</th>
              <th className="text-right py-2 text-gray-400 font-medium">Cash</th>
            </tr>
          </thead>
          <tbody>
            {bySource.map((row) => (
              <tr key={row.src} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[row.src]}`}>
                    • {row.src}
                  </span>
                </td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{row.booked}</td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{row.qualified}</td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{row.closed}</td>
                <td className="py-2.5 text-right text-gray-500">{row.showRate}</td>
                <td className="py-2.5 text-right text-gray-500">{row.closeRate}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{row.cash}</td>
              </tr>
            ))}
            <tr className="font-semibold border-t border-gray-200">
              <td className="py-2.5 text-gray-900">Total</td>
              <td className="py-2.5 text-right text-gray-900">{booked}</td>
              <td className="py-2.5 text-right text-gray-900">{showed}</td>
              <td className="py-2.5 text-right text-gray-900">{closed}</td>
              <td className="py-2.5 text-right text-gray-700">
                {booked > 0 ? `${((showed / booked) * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-2.5 text-right text-gray-700">
                {showed > 0 ? `${((closed / showed) * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-2.5 text-right text-gray-900">{fmtCash(totalCash)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
