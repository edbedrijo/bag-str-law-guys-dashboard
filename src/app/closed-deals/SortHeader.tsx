'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  label: string
  field: string
}

export default function SortHeader({ label, field }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const currentSort = params.get('sort')
  const currentDir  = params.get('dir') ?? 'asc'

  const isActive = currentSort === field
  const nextDir  = isActive && currentDir === 'asc' ? 'desc' : 'asc'

  function handleClick() {
    const next = new URLSearchParams(params.toString())
    next.set('sort', field)
    next.set('dir', nextDir)
    router.push(`?${next.toString()}`)
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-gray-400 font-medium hover:text-gray-700 transition-colors"
    >
      {label}
      <span className="text-xs leading-none">
        {isActive ? (currentDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}
