'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export interface LeadQualityDataPoint {
  month: string
  'High Value': number
  'Qualified': number
  'So-So': number
  'Low Quality': number
  'Bad Lead': number
}

interface Props { data: LeadQualityDataPoint[] }

export default function LeadQualityChart({ data }: Props) {
  const enriched = data.map((d) => ({
    month: d.month,
    'Good Leads': d['High Value'] + d['Qualified'],
    'Bad Leads':  d['Bad Lead']  + d['Low Quality'],
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={enriched} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ color: '#6b7280', fontSize: 12, paddingTop: 12 }} />
        <Line type="monotone" dataKey="Good Leads" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="Bad Leads"  stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
