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

export interface LeadQualityDataPoint {
  month: string
  'High Value': number
  'Qualified': number
  'So-So': number
  'Low Quality': number
  'Bad Lead': number
}

interface LeadQualityChartProps {
  data: LeadQualityDataPoint[]
}

const COLORS = {
  'High Value':  '#10b981',
  'Qualified':   '#0ea5e9',
  'So-So':       '#f59e0b',
  'Low Quality': '#f97316',
  'Bad Lead':    '#ef4444',
}

export default function LeadQualityChart({ data }: LeadQualityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ color: '#6b7280', fontSize: 12, paddingTop: 8 }} />
        {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((key) => (
          <Bar key={key} dataKey={key} stackId="quality" fill={COLORS[key]} radius={key === 'High Value' ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
