'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface MonthlyDataPoint {
  month: string
  leads: number
  booked: number
  showed: number
  closed: number
}

interface MonthlyChartProps {
  data: MonthlyDataPoint[]
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          itemStyle={{ color: '#374151' }}
        />
        <Legend wrapperStyle={{ color: '#6b7280', fontSize: 12, paddingTop: 12 }} />
        <Bar dataKey="leads" name="Leads"     fill="#6b7280" radius={[3, 3, 0, 0]} />
        <Bar dataKey="booked" name="Booked"   fill="#0891b2" radius={[3, 3, 0, 0]} />
        <Bar dataKey="showed" name="Qualified" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="closed" name="Won"      fill="#f59e0b" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
