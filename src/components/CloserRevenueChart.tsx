'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'

export interface CloserPoint { closer: string; deals: number; revenue: number }

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#a855f7']

function fmtDollar(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
}

function fmtFull(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function CloserRevenueChart({ data }: { data: CloserPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-gray-400 mt-4">No data yet</p>
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 70, left: 8, bottom: 0 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
          <YAxis type="category" dataKey="closer" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            formatter={(v) => [fmtFull(Number(v)), 'Cash Collected']}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="revenue" name="Cash Collected" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-2">
        {data.map((c, i) => (
          <div key={c.closer} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-gray-700 font-medium">{c.closer}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-900 font-semibold">{fmtFull(c.revenue)}</span>
              <span className="text-gray-400 text-xs ml-1">({c.deals} deals)</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
