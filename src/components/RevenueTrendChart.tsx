'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

export interface RevenueTrendPoint {
  month:        string
  revenue:      number
  deals:        number
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
  const avg = data.length > 0 ? data.reduce((s, d) => s + d.revenue, 0) / data.length : 0

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="rev"   orientation="left"  tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
        <YAxis yAxisId="deals" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        {avg > 0 && (
          <ReferenceLine yAxisId="rev" y={avg} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: 'avg', position: 'insideTopRight', fill: '#94a3b8', fontSize: 11 }} />
        )}
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          formatter={(value, name) => ['Revenue', 'Cash Collected'].includes(String(name)) ? [fmtFull(Number(value)), name] : [value, name]}
        />
        <Legend wrapperStyle={{ color: '#6b7280', fontSize: 12, paddingTop: 12 }} />
        <Line yAxisId="rev"   type="monotone" dataKey="revenue"       name="Revenue"        stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
        <Line yAxisId="rev"   type="monotone" dataKey="cashCollected" name="Cash Collected" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 4, fill: '#0891b2' }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
        <Line yAxisId="deals" type="monotone" dataKey="deals"         name="Deals"          stroke="#10b981" strokeWidth={2}   dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
      </LineChart>
    </ResponsiveContainer>
  )
}
