'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface ChartDataPoint {
  month: string
  Paid: number
  Referral: number
  Organic: number
}

interface Props {
  bookedData: ChartDataPoint[]
  cashData: ChartDataPoint[]
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 },
  labelStyle: { color: '#111827', fontWeight: 600 },
  itemStyle: { color: '#374151' },
}

const axisProps = { fill: '#6b7280', fontSize: 12 }

export default function BySourceCharts({ bookedData, cashData }: Props) {
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Calls booked by source</h2>
        <p className="text-sm text-gray-400 mb-4">Per month — Paid vs Referral vs Organic</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bookedData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <XAxis dataKey="month" tick={axisProps} axisLine={false} tickLine={false} />
            <YAxis tick={axisProps} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Paid"     fill="#0891b2" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Referral" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Organic"  fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900">Cash collected by source</h2>
        <p className="text-sm text-gray-400 mb-4">
          Per month — <span className="text-orange-500">referral partner link</span> is the big driver
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={cashData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <XAxis dataKey="month" tick={axisProps} axisLine={false} tickLine={false} />
            <YAxis tick={axisProps} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Paid"     fill="#0891b2" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Referral" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Organic"  fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
