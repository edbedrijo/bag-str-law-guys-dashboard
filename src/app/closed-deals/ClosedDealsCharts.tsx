'use client'

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'

interface MonthPoint  { month: string; deals: number; revenue: number }
interface SourcePoint { source: string; deals: number; revenue: number; pct: string }
interface MatterPoint { type: string; deals: number; revenue: number }

interface Props {
  monthly: MonthPoint[]
  bySource: SourcePoint[]
  byMatter: MatterPoint[]
}

const SOURCE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#64748b']
const MATTER_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

function fmtDollar(n: number) {
  return n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtFull(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function ClosedDealsCharts({ monthly, bySource, byMatter }: Props) {
  return (
    <div className="space-y-6">

      {/* Line chart — Closed Deals By Month */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Closed Deals By Month</h2>
        <p className="text-sm text-gray-400 mb-5">Deal count and revenue per month</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthly} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="deals" orientation="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
            <Tooltip
              formatter={(value, name) =>
                name === 'Revenue' ? [fmtFull(Number(value)), name] : [value, name]
              }
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
            <Line yAxisId="deals"   type="monotone" dataKey="deals"   name="Deals"   stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
            <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Donut (lead source) + Horizontal bar (matter type) */}
      <div className="grid grid-cols-2 gap-6">

        {/* Donut — By Lead Source */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">By Lead Source</h2>
          <p className="text-sm text-gray-400 mb-4">Revenue share by source</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={bySource}
                  dataKey="revenue"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {bySource.map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtFull(Number(v))}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2.5 flex-1">
              {bySource.map((s, i) => (
                <div key={s.source} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-gray-700 font-medium">{s.source || 'Unknown'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-900 font-semibold">{s.pct}</span>
                    <span className="text-gray-400 text-xs ml-1">({s.deals})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal bar — By Matter Type */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">By Matter Type</h2>
          <p className="text-sm text-gray-400 mb-4">Deals and revenue per matter type</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              layout="vertical"
              data={byMatter}
              margin={{ top: 0, right: 80, left: 8, bottom: 0 }}
              barSize={18}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={140} />
              <Tooltip
                formatter={(v, name) =>
                  name === 'Revenue' ? [fmtFull(Number(v)), name] : [v, name]
                }
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                {byMatter.map((_, i) => (
                  <Cell key={i} fill={MATTER_COLORS[i % MATTER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {byMatter.map((m, i) => (
              <div key={m.type} className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: MATTER_COLORS[i % MATTER_COLORS.length] }} />
                  <span className="truncate max-w-[180px]">{m.type}</span>
                </div>
                <span className="font-medium text-gray-700">{m.deals} deals · {fmtFull(m.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
