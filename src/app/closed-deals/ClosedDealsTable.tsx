'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Pencil } from 'lucide-react'
import { DealModal, type DealOptions } from './DealModal'
import type { ClosedDealRow } from '@/lib/sheets'

type ColKey = 'clientName' | 'email' | 'phone' | 'matterType' | 'intakeDate' | 'amount' | 'cashCollected' | 'referredBy' | 'leadSource'

interface ColDef { key: ColKey; label: string; sortField?: string; defaultW: number }

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

const DEFAULT_ORDER:  ColKey[]               = ALL_COLS.map((c) => c.key)
const DEFAULT_WIDTHS: Record<ColKey, number> = Object.fromEntries(ALL_COLS.map((c) => [c.key, c.defaultW])) as Record<ColKey, number>

const LS_ORDER  = 'closedDeals_colOrder'
const LS_WIDTHS = 'closedDeals_colWidths'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMoney(val: string): number {
  return parseFloat((val ?? '').replace(/[$,]/g, '')) || 0
}
function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  return raw
}

function TruncCell({ value, className }: { value: string; className?: string }) {
  if (!value) return null
  return (
    <span title={value} className={`block overflow-hidden text-ellipsis whitespace-nowrap ${className ?? ''}`}>
      {value}
    </span>
  )
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

function renderCell(deal: ClosedDealRow, key: ColKey): React.ReactNode {
  switch (key) {
    case 'clientName':    return deal.clientName    ? <TruncCell value={deal.clientName}    className="font-medium text-gray-900" /> : null
    case 'email':         return deal.email         ? <TruncCell value={deal.email}         className="text-gray-500" /> : null
    case 'phone':         return deal.phone         ? <span className="text-gray-500 whitespace-nowrap">{formatPhone(deal.phone)}</span> : null
    case 'matterType':    return deal.matterType    ? <TruncCell value={deal.matterType}    className="text-gray-700" /> : null
    case 'intakeDate':    return deal.intakeDate    ? <span className="text-gray-500 whitespace-nowrap">{deal.intakeDate}</span> : null
    case 'amount':        return parseMoney(deal.amount) > 0
      ? <span className="font-semibold text-gray-900 whitespace-nowrap">{fmt(parseMoney(deal.amount))}</span> : null
    case 'cashCollected': return parseMoney(deal.cashCollected) > 0
      ? <span className="font-semibold text-emerald-700 whitespace-nowrap">{fmt(parseMoney(deal.cashCollected))}</span> : null
    case 'referredBy':    return deal.referredBy    ? <TruncCell value={deal.referredBy}    className="text-gray-600" /> : null
    case 'leadSource':    return sourceChip(deal.leadSource)
    default: return null
  }
}

// ── Sort button ───────────────────────────────────────────────────────────────

function SortBtn({ label, field, sort, dir, onSort }: {
  label: string; field: string; sort: string; dir: string; onSort: (f: string) => void
}) {
  const active = sort === field
  return (
    <button onClick={(e) => { e.stopPropagation(); onSort(field) }}
      className="flex items-center gap-1 text-gray-500 font-semibold hover:text-gray-700 transition-colors">
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
  const [page,      setPage]      = useState(1)
  const [pageSize,  setPageSize]  = useState(20)
  const [openIdx,   setOpenIdx]   = useState<number | null>(null)

  useEffect(() => {
    try {
      const o = localStorage.getItem(LS_ORDER)
      if (o) {
        const parsed: ColKey[] = JSON.parse(o)
        const valid   = parsed.filter((k) => ALL_COLS.some((c) => c.key === k))
        const missing = DEFAULT_ORDER.filter((k) => !valid.includes(k))
        setColOrder([...valid, ...missing])
      }
    } catch {}
    try {
      const w = localStorage.getItem(LS_WIDTHS)
      if (w) setColWidths({ ...DEFAULT_WIDTHS, ...JSON.parse(w) })
    } catch {}
  }, [])

  // ── Column reorder ────────────────────────────────────────────────────────
  const dragCol           = useRef<ColKey | null>(null)
  const dragOverCol       = useRef<ColKey | null>(null)
  const isDraggingReorder = useRef(false)

  function onReorderStart(key: ColKey) { dragCol.current = key; isDraggingReorder.current = true }
  function onReorderEnter(key: ColKey) { dragOverCol.current = key }
  function onReorderEnd() {
    if (!isDraggingReorder.current) return
    isDraggingReorder.current = false
    if (!dragCol.current || !dragOverCol.current || dragCol.current === dragOverCol.current) return
    const next = [...colOrder]
    const from = next.indexOf(dragCol.current)
    const to   = next.indexOf(dragOverCol.current)
    next.splice(from, 1); next.splice(to, 0, dragCol.current!)
    setColOrder(next)
    localStorage.setItem(LS_ORDER, JSON.stringify(next))
    dragCol.current = null; dragOverCol.current = null
  }

  // ── Column resize ─────────────────────────────────────────────────────────
  const resizing = useRef<{ key: ColKey; startX: number; startW: number } | null>(null)

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing.current) return
    const newW = Math.max(60, resizing.current.startW + e.clientX - resizing.current.startX)
    setColWidths((prev) => {
      const next = { ...prev, [resizing.current!.key]: newW }
      localStorage.setItem(LS_WIDTHS, JSON.stringify(next))
      return next
    })
  }, [])
  const onResizeUp = useCallback(() => { resizing.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup',  onResizeUp)
    return () => {
      window.removeEventListener('mousemove', onResizeMove)
      window.removeEventListener('mouseup',  onResizeUp)
    }
  }, [onResizeMove, onResizeUp])

  function startResize(e: React.MouseEvent, key: ColKey) {
    e.stopPropagation(); e.preventDefault()
    isDraggingReorder.current = false
    resizing.current = { key, startX: e.clientX, startW: colWidths[key] }
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  function handleSort(field: string) {
    const newDir = sort === field && dir === 'asc' ? 'desc' : 'asc'
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', field); params.set('dir', newDir)
    router.push(`${pathname}?${params.toString()}`)
    setPage(1)
  }

  function parseDate(val: string): number {
    if (!val) return 0
    const parts = val.split(/[\/\-]/)
    if (parts.length < 3) return 0
    if (parts[0].length <= 2) return parseInt(parts[2]) * 10000 + parseInt(parts[0]) * 100 + parseInt(parts[1])
    return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2])
  }

  // Track originalIndex so PUT/DELETE hit the correct sheet row after sort
  const indexed = rawDeals.map((deal, originalIndex) => ({ deal, originalIndex }))
  const sorted  = [...indexed].sort((a, b) => {
    const diff = sort === 'amount'
      ? parseMoney(a.deal.amount) - parseMoney(b.deal.amount)
      : parseDate(a.deal.intakeDate) - parseDate(b.deal.intakeDate)
    return dir === 'desc' ? -diff : diff
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const orderedCols = colOrder.map((k) => ALL_COLS.find((c) => c.key === k)!).filter(Boolean)
  const openEntry   = openIdx !== null ? paginated[openIdx] : null

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
        <table
          className="text-sm border-collapse"
          style={{ tableLayout: 'fixed', minWidth: '100%', width: orderedCols.reduce((s, c) => s + colWidths[c.key], 0) + 48 }}
        >
          <colgroup>
            {orderedCols.map((col) => <col key={col.key} style={{ width: colWidths[col.key] }} />)}
            <col style={{ width: 48 }} />
          </colgroup>
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr>
              {orderedCols.map((col) => (
                <th key={col.key} draggable
                  onDragStart={() => onReorderStart(col.key)}
                  onDragEnter={() => onReorderEnter(col.key)}
                  onDragEnd={onReorderEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="px-3 py-1.5 text-left select-none cursor-grab active:cursor-grabbing group relative border border-gray-200 bg-gray-50"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" />
                    {col.sortField
                      ? <SortBtn label={col.label} field={col.sortField} sort={sort} dir={dir} onSort={handleSort} />
                      : <span className="truncate text-gray-500 font-semibold">{col.label}</span>}
                  </span>
                  <div onMouseDown={(e) => startResize(e, col.key)}
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-teal-200 transition-colors rounded-sm" />
                </th>
              ))}
              <th className="px-3 py-1.5 w-12 border border-gray-200 bg-gray-50 sticky right-0 z-30" />
            </tr>
          </thead>
          <tbody>
            {paginated.map(({ deal }, i) => (
              <tr key={i}
                onClick={() => setOpenIdx(i)}
                className="hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                {orderedCols.map((col) => (
                  <td key={col.key} className="px-3 py-1.5 overflow-hidden border border-gray-200 whitespace-nowrap max-w-0">
                    {renderCell(deal, col.key)}
                  </td>
                ))}
                <td
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 text-right border border-gray-200 bg-white sticky right-0 z-10"
                >
                  <button
                    onClick={() => setOpenIdx(i)}
                    className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Edit deal"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={orderedCols.length + 1} className="py-10 text-center text-gray-400 border border-gray-200 whitespace-normal">
                  No closed deals found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
        <span>Page {safePage} of {totalPages} &nbsp;·&nbsp; {sorted.length} deal{sorted.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-3">
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <button disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Prev
          </button>
          <span className="px-2 py-1 rounded-lg border border-teal-400 bg-teal-50 text-teal-700 font-semibold min-w-[32px] text-center">
            {safePage}
          </span>
          <button disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next
          </button>
        </div>
      </div>

      {/* Modal — rendered once, driven by openIdx */}
      {openEntry && (
        <DealModal
          mode="edit"
          rowIndex={openEntry.originalIndex}
          initial={openEntry.deal}
          options={options}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </div>
  )
}
