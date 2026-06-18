'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { PRESETS, type DateRangePreset } from '@/lib/dateRange'
import { ChevronDown } from 'lucide-react'

interface DateRangePickerProps {
  current: DateRangePreset
}

export default function DateRangePicker({ current }: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const currentLabel = PRESETS.find((p) => p.value === current)?.label ?? 'This year (YTD)'

  return (
    <div className="relative inline-flex items-center">
      <select
        value={current}
        onChange={onChange}
        className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  )
}
