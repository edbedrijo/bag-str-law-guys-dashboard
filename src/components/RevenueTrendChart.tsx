'use client'

import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export interface RevenueTrendPoint {
  month:         string
  revenue:       number
  deals:         number
  cashCollected: number
}

interface Props { data: RevenueTrendPoint[] }

function fmtDollar(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

function fmtFull(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function RevenueTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="deals" orientation="left"  tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis yAxisId="money" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          formatter={(value, name) =>
            name === 'Deals' ? [value, name] : [fmtFull(Number(value)), name]
          }
        />
        <Legend wrapperStyle={{ color: '#6b7280', fontSize: 12, paddingTop: 12 }} />
        <Bar     yAxisId="deals" dataKey="deals"         name="Deals"          fill="#818cf8" radius={[4, 4, 0, 0]} barSize={28} />
        <Line    yAxisId="money" dataKey="revenue"       name="Revenue"        type="monotone" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
        <Line    yAxisId="money" dataKey="cashCollected" name="Cash Collected" type="monotone" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
