'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface CashBySourceDonutProps {
  data: { label: string; amount: number; color: string; pct: string }[]
}

export default function CashBySourceDonut({ data }: CashBySourceDonutProps) {
  return (
    <div className="flex flex-col h-full">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            dataKey="amount"
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              typeof value === 'number'
                ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
                : String(value)
            }
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-1">
        {data.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
              <span className="text-sm text-gray-600">{row.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900">
                {row.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-gray-400 w-10 text-right">{row.pct}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
