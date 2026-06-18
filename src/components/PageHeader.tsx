interface PageHeaderProps {
  title: string
  dateRange?: string
  badge?: string
}

export default function PageHeader({ title, dateRange = 'Jan – Jun 2026', badge = 'Deduped · live sample' }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-sm text-gray-400">{dateRange}</span>
        <span className="text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2.5 py-0.5">
          {badge}
        </span>
      </div>
    </div>
  )
}
