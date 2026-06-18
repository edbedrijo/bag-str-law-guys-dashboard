import { type LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  iconColor?: string
}

export default function KpiCard({ label, value, sub, icon: Icon, iconColor = 'text-teal-500' }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
