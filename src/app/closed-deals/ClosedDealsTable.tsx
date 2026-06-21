'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { EditDealButton, type DealOptions } from './DealModal'
import type { ClosedDealRow } from '@/lib/sheets'

// ── Column definitions ────────────────────────────────────────────────────────

type ColKey = 'clientName' | 'email' | 'phone' | 'matterType' | 'intakeDate' | 'amount' | 'cashCollected' | 'referredBy' | 'leadSource'

interface ColDef {
  key:       ColKey
  label:     string
  sortField?: string
  defaultW:  number   // default pixel width
}

const ALL_COLS: ColDef[] = [
  { key: 'clientName',    label: 'Client Name',   defaultW: 260 },
  { key: 'email',         label: 'Email',          defaultW: 210 },
  { key: 'phone',         label: 'Phone',          defaultW: 140 },
  { key: 'matterType',    label: 'Matter Type',    defaultW: 185 },
  { key: 'intakeDate',    label: 'Date',           sortField: 'date',   defaultW: 110 },
  { key: 'amount',        label: 'Amount',         sortField: 'amount', defaultW: 120 },
  { key: 'cashCollected', label: 'Cash Collected', defaultW: 130 },
  { key: 'referredBy',    label: 'Referred By',    defaultW: 145 },
  { key: 'leadSource',    label: 'Lead Source',    defaultW: 110 },
]

const DEFAULT_ORDER: ColKey[]                = ALL_COLS.map((c) => c.key)
const DEFAULT_WIDTHS: Record<ColKey, number> = Object.fromEntries(ALL_COLS.map((c) => [c.key, c.defaultW])) as Record<ColKey, number>

const LS_ORDER  = 'closedDeals_colOrder'
const LS_WIDTHS = 'closedDeals_colWidths'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMoney(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  return raw
}

const SOURCE_COLORS: Record<string, string> = {
  website:  'bg-blue-50 text-blue-700 border border-blue-200',
  ghl:      'bg-purple-50 text-purple-700 border border-purple-200',
  referral: 'bg-orange-50 text-orange-700 border border-orange-200',
  paid:     'bg-cyan-50 text-cyan-700 border border-cyan-200',
}

function sourceChip(src: string) {
  if (!src) return null
  const key = Object.keys(SOURCE_COLORS).find((k) => src.toLowerCase().includes(k)) ?? ''
  const cls = SOURCE_COLORS[key] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{src}</span>
}

// Truncated cell: clips text with ellipsis, full value shown on hover via title
function TruncCell({ value, className }: { value: string; className?: string }) {
  if (!value) return null
  return (
    <span
      title={value}
      className={`block overflow-hidden text-ellipsis whitespace-nowrap ${className ?? ''}`}
    >
      {value}
    </span>
  )
}

function renderCell(deal: ClosedDealRow, key: ColKey): React.ReactNode {
  switch (key) {
    case 'clientName':
      return deal.clientName
        ? <TruncCell value={deal.clientName} className="font-medium text-gray-900" />
        : null
    case 'email':
      return deal.email
        ? <TruncCell value={deal.email} className="text-gray-500" />
        : null
    case 'phone':
      return deal.phone
        ? <span className="text-gray-500 whitespace-nowrap">{formatPhone(deal.phone)}</span>
        : null
    case 'matterType':
      return deal.matterType
        ? <TruncCell value={deal.matterType} className="text-gray-700" />
        : null
    case 'intakeDate':
      return deal.intakeDate
        ? <span className="text-gray-500 whitespace-nowrap">{deal.intakeDate}</span>
        : null
    case 'amount':
      return parseMoney(deal.amount) > 0
        ? <span className="font-semibold text-gray-900 whitespace-nowrap">{fmt(parseMoney(deal.amount))}</span>
        : null
    case 'cashCollected':
      return parseMoney(deal.cashCollected) > 0
        ? <span className="font-semibold text-emerald-700 whitespace-nowrap">{fmt(parseMoney(deal.cashCollected))}</span>
        : null
    case 'referredBy':
      return deal.referredBy
        ? <TruncCell value={deal.referredBy} className="text-gray-600" />
        : null
    case 'leadSource':
      return sourceChip(deal.leadSource)
    default:
      return null
  }
}

// ── Sort button ───────────────────────────────────────────────────────────────

function SortBtn({ label, field, sort, dir, onSort }: {
  label: string; field: string; sort: string; dir: string
  onSort: (field: string) => void
}) {
  const active = sort === field
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSort(field) }}
      className="flex items-center gap-1 text-gray-400 font-medium hover:text-gray-700 transition-colors"
    >
      {label}
      {active
        ? (dir === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)
        : <ArrowUpDown className="w-3 h-3" />}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClosedDealsTable({ deals: rawDeals, options }: { deals: ClosedDealRow[]; options: DealOptions }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const sort = searchParams.get('sort') ?? 'date'
  const dir  = searchParams.get('dir')  ?? 'asc'

  const [colOrder,  setColOrder]  = useState<ColKey[]>(DEFAULT_ORDER)
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)

  // Load saved order + widths from localStorage
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(LS_ORDER)
      if (savedOrder) {
        const parsed: ColKey[] = JSON.parse(savedOrder)
        const valid   = parsed.filter((k) => ALL_COLS.some((c) => c.key === k))
        const missing = DEFAULT_ORDER.filter((k) => !valid.includes(k))
        setColOrder([...valid, ...missing])
      }
    } catch {}

    try {
      const savedWidths = localStorage.getItem(LS_WIDTHS)
      if (savedWidths) {
        const parsed = JSON.parse(savedWidths) as Partial<Record<ColKey, number>>
        setColWidths({ ...DEFAULT_WIDTHS, ...parsed })
      }
    } catch {}
  }, [])

  // ── Column reorder (drag entire header) ──────────────────────────────────────
  const dragCol     = useRef<ColKey | null>(null)
  const dragOverCol = useRef<ColKey | null>(null)
  const isDraggingReorder = useRef(false)

  function onReorderStart(key: ColKey) {
    dragCol.current = key
    isDraggingReorder.current = true
  }
  function onReorderEnter(key: ColKey) { dragOverCol.current = key }
  function onReorderEnd() {
    if (!isDraggingReorder.current) return
    isDraggingReorder.current = false
    if (!dragCol.current || !dragOverCol.current || dragCol.current === dragOverCol.current) return
    const next = [...colOrder]
    const fromIdx = next.indexOf(dragCol.current)
    const toIdx   = next.indexOf(dragOverCol.current)
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, dragCol.current)
    setColOrder(next)
    localStorage.setItem(LS_ORDER, JSON.stringify(next))
    dragCol.current = null
    dragOverCol.current = null
  }

  // ── Column resize (drag right edge of header) ─────────────────────────────
  const resizing = useRef<{ key: ColKey; startX: number; startW: number } | null>(null)

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing.current) return
    const delta = e.clientX - resizing.current.startX
    const newW  = Math.max(60, resizing.current.startW + delta)
    setColWidths((prev) => {
      const next = { ...prev, [resizing.current!.key]: newW }
      localStorage.setItem(LS_WIDTHS, JSON.stringify(next))
      return next
    })
  }, [])

  const onResizeUp = useCallback(() => { resizing.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', onResizeUp)
    return () => {
      window.removeEventListener('mousemove', onResizeMove)
      window.removeEventListener('mouseup', onResizeUp)
    }
  }, [onResizeMove, onResizeUp])

  function startResize(e: React.MouseEvent, key: ColKey) {
    e.stopPropagation()
    e.preventDefault()
    isDraggingReorder.current = false  // prevent reorder firing on resize drag end
    resizing.current = { key, startX: e.clientX, startW: colWidths[key] }
  }

  // ── Sorting ───────────────────────────────────────────────────────────────
  function handleSort(field: string) {
    const newDir = sort === field && dir === 'asc' ? 'desc' : 'asc'
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', field)
    params.set('dir', newDir)
    router.push(`${pathname}?${params.toString()}`)
  }

  function parseDate(val: string): number {
    if (!val) return 0
    const parts = val.split(/[\/\-]/)
    if (parts.length < 3) return 0
    if (parts[0].length <= 2) return parseInt(parts[2]) * 10000 + parseInt(parts[0]) * 100 + parseInt(parts[1])
    return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2])
  }

  const deals = [...rawDeals].sort((a, b) => {
    const diff = sort === 'amount'
      ? parseMoney(a.amount) - parseMoney(b.amount)
      : parseDate(a.intakeDate) - parseDate(b.intakeDate)
    return dir === 'desc' ? -diff : diff
  })

  const orderedCols = colOrder.map((k) => ALL_COLS.find((c) => c.key === k)!).filter(Boolean)

  return (
    <div className="overflow-x-auto">
      <table className="text-sm" style={{ tableLayout: 'fixed', minWidth: '100%', width: orderedCols.reduce((s, c) => s + colWidths[c.key], 0) + 48 }}>
        <colgroup>
          {orderedCols.map((col) => (
            <col key={col.key} style={{ width: colWidths[col.key] }} />
          ))}
          <col style={{ width: 48 }} />
        </colgroup>
        <thead>
          <tr className="border-y border-gray-100">
            {orderedCols.map((col) => (
              <th
                key={col.key}
                draggable
                onDragStart={() => onReorderStart(col.key)}
                onDragEnter={() => onReorderEnter(col.key)}
                onDragEnd={onReorderEnd}
                onDragOver={(e) => e.preventDefault()}
                className="px-3 py-2.5 text-left select-none cursor-grab active:cursor-grabbing group relative"
              >
                <span className="flex items-center gap-1.5 text-gray-400 font-medium min-w-0">
                  <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" />
                  {col.sortField
                    ? <SortBtn label={col.label} field={col.sortField} sort={sort} dir={dir} onSort={handleSort} />
                    : <span className="truncate">{col.label}</span>}
                </span>
                {/* Resize handle — right edge of header */}
                <div
                  onMouseDown={(e) => startResize(e, col.key)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-teal-200 transition-colors rounded-sm"
                />
              </th>
            ))}
            <th className="px-3 py-2.5 w-12" />
          </tr>
        </thead>
        <tbody>
          {deals.map((deal, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              {orderedCols.map((col) => (
                <td key={col.key} className="px-3 py-2.5 overflow-hidden">
                  {renderCell(deal, col.key)}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right">
                <EditDealButton rowIndex={i} options={options} deal={{
                  clientName: deal.clientName, email: deal.email, phone: deal.phone,
                  matterType: deal.matterType, intakeDate: deal.intakeDate,
                  amount: deal.amount, cashCollected: deal.cashCollected,
                  referredBy: deal.referredBy, leadSource: deal.leadSource,
                }} />
              </td>
            </tr>
          ))}
          {deals.length === 0 && (
            <tr>
              <td colSpan={orderedCols.length + 1} className="py-10 text-center text-gray-400">
                No closed deals found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50 text-right">
        {deals.length} deal{deals.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
