'use client'

import {
  ResponsiveContainer,
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart,
} from 'recharts'

interface MonthPoint  { month: string; deals: number; revenue: number; cash: number }
interface SourcePoint { source: string; deals: number; revenue: number; pct: string }
interface MatterPoint { type: string; deals: number; revenue: number }
interface CloserPoint { closer: string; deals: number; revenue: number }

interface Props {
  monthly:  MonthPoint[]
  bySource: SourcePoint[]
  byMatter: MatterPoint[]
  byCloser: CloserPoint[]
}

const SOURCE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#64748b']
const MATTER_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']
const CLOSER_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#a855f7']

function fmtDollar(n: number) {
  return n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtFull(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function ClosedDealsCharts({ monthly, bySource, byMatter, byCloser }: Props) {
  return (
    <div className="space-y-6">

      {/* ComposedChart — Closed Deals By Month: bars for count, lines for revenue + cash */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Closed Deals By Month</h2>
        <p className="text-sm text-gray-400 mb-5">Deals closed · revenue contracted vs cash received</p>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={monthly} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="deals" orientation="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="money" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
            <Tooltip
              formatter={(value, name) =>
                name === 'Deals' ? [value, name] : [fmtFull(Number(value)), name]
              }
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
            <Bar yAxisId="deals" dataKey="deals" name="Deals" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={28} />
            <Line yAxisId="money" type="monotone" dataKey="revenue" name="Revenue"       stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
            <Line yAxisId="money" type="monotone" dataKey="cash"    name="Cash Collected" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Donut + Matter Type + Revenue by Closer */}
      <div className="grid grid-cols-3 gap-6">

        {/* Donut — By Lead Source */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">By Lead Source</h2>
          <p className="text-sm text-gray-400 mb-4">Revenue share by source</p>
          <div className="flex flex-col items-center gap-4">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={bySource}
                  dataKey="revenue"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={66}
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
            <div className="w-full flex flex-col gap-2">
              {bySource.map((s, i) => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-gray-700 font-medium truncate max-w-[90px]">{s.source || 'Unknown'}</span>
                  </div>
                  <span className="text-gray-900 font-semibold">{s.pct} <span className="text-gray-400 font-normal">({s.deals})</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal bar — By Matter Type */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">By Matter Type</h2>
          <p className="text-sm text-gray-400 mb-4">Deals and revenue per matter type</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              layout="vertical"
              data={byMatter}
              margin={{ top: 0, right: 70, left: 8, bottom: 0 }}
              barSize={16}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                formatter={(v, name) => name === 'Revenue' ? [fmtFull(Number(v)), name] : [v, name]}
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
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: MATTER_COLORS[i % MATTER_COLORS.length] }} />
                  <span className="truncate max-w-[120px]">{m.type}</span>
                </div>
                <span className="font-medium text-gray-700 shrink-0">{m.deals}d · {fmtFull(m.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar — Revenue by Closer */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Revenue by Closer</h2>
          <p className="text-sm text-gray-400 mb-4">Cash collected per closer (WON deals)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              layout="vertical"
              data={byCloser}
              margin={{ top: 0, right: 70, left: 8, bottom: 0 }}
              barSize={16}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtDollar} />
              <YAxis type="category" dataKey="closer" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                formatter={(v) => [fmtFull(Number(v)), 'Cash Collected']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="revenue" name="Cash Collected" radius={[0, 4, 4, 0]}>
                {byCloser.map((_, i) => (
                  <Cell key={i} fill={CLOSER_COLORS[i % CLOSER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {byCloser.map((c, i) => (
              <div key={c.closer} className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: CLOSER_COLORS[i % CLOSER_COLORS.length] }} />
                  <span className="font-medium text-gray-700">{c.closer}</span>
                </div>
                <span className="shrink-0">{c.deals} deals · {fmtFull(c.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
