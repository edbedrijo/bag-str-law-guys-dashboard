'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export interface MonthlyDataPoint {
  month:   string
  leads:   number
  booked:  number
  showed:  number
  closed:  number
}

interface Props {
  data: MonthlyDataPoint[]
}

export default function MonthlyChart({ data }: Props) {
  const enriched = data.map((d) => ({
    ...d,
    showRate: d.booked > 0 ? parseFloat(((d.showed / d.booked) * 100).toFixed(1)) : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={enriched} margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        {/* Left axis — volume counts */}
        <YAxis yAxisId="count" orientation="left"  tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        {/* Right axis — show rate % */}
        <YAxis yAxisId="rate"  orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          formatter={(value, name) => name === 'Show Rate' ? [`${value}%`, name] : [value, name]}
        />
        <Legend wrapperStyle={{ color: '#6b7280', fontSize: 12, paddingTop: 12 }} />
        <Bar yAxisId="count" dataKey="leads"    name="Leads"     fill="#94a3b8" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="count" dataKey="booked"   name="Booked"    fill="#0891b2" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="count" dataKey="showed"   name="Showed"    fill="#10b981" radius={[3, 3, 0, 0]} />
        <Line yAxisId="rate" type="monotone" dataKey="showRate" name="Show Rate" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
