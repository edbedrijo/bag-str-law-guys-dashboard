'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface CashTrendDataPoint {
  month: string
  cash: number
}

interface CashTrendChartProps {
  data: CashTrendDataPoint[]
}

function fmtY(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

export default function CashTrendChart({ data }: CashTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0891b2" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtY} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          formatter={(value) =>
            typeof value === 'number'
              ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
              : String(value)
          }
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey="cash"
          name="Cash collected"
          stroke="#0891b2"
          strokeWidth={2}
          fill="url(#cashGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#0891b2' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
