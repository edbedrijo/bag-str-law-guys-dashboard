import { type LucideIcon } from 'lucide-react'

interface KpiCardDelta {
  diff: number       // absolute change
  pct: number        // percent change
  label: string      // e.g. "vs May"
  invert?: boolean   // true = lower is better (e.g. avg days to paid)
}

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  iconColor?: string
  delta?: KpiCardDelta
}

export default function KpiCard({ label, value, sub, icon: Icon, iconColor = 'text-teal-500', delta }: KpiCardProps) {
  let deltaEl = null
  if (delta && delta.diff !== 0) {
    const isPositive = delta.invert ? delta.diff < 0 : delta.diff > 0
    const arrow = delta.diff > 0 ? '▲' : '▼'
    const absDiff = Math.abs(delta.diff)
    const absPct = Math.abs(delta.pct)
    const colorClass = isPositive ? 'text-emerald-600' : 'text-red-500'
    const sign = delta.diff > 0 ? '+' : '-'
    deltaEl = (
      <span className={`text-[10px] font-semibold ${colorClass}`}>
        {arrow} {sign}{absDiff} ({absPct.toFixed(0)}%) {delta.label}
      </span>
    )
  } else if (delta && delta.diff === 0) {
    deltaEl = <span className="text-[10px] text-gray-400">— flat {delta.label}</span>
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
      {deltaEl && <div className="mt-1.5 pt-1.5 border-t border-gray-100">{deltaEl}</div>}
    </div>
  )
}
