'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface WeekData {
  label: string
  Paid: number
  Referral: number
  Organic: number
}

export default function WeeklyCallsChart({ data }: { data: WeekData[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
      <h2 className="text-base font-semibold text-gray-900">Calls booked per week by source</h2>
      <p className="text-sm text-gray-400 mb-4">Every week with booked calls, split Paid / Referral / Organic</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
            labelStyle={{ color: '#111827', fontWeight: 600 }}
            itemStyle={{ color: '#374151' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
          <Bar dataKey="Paid"     fill="#0891b2" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Referral" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Organic"  fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
