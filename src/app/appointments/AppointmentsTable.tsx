'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { GripVertical, ExternalLink, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { AppointmentRow } from '@/types/appointments'
import { ApptModal, rowToFields, type ApptOptions } from './AppointmentModal'

type ColKey =
  | 'name' | 'email' | 'phone' | 'dateIn' | 'callDate'
  | 'callStatus' | 'callOutcome' | 'cashCollected'
  | 'closer' | 'setter' | 'leadQuality' | 'callQuality'
  | 'setterRecording' | 'salesRecording' | 'notes' | 'calendar'

interface ColDef { key: ColKey; label: string; sortField?: string; defaultW: number }

const ALL_COLS: ColDef[] = [
  { key: 'name',            label: 'Name',             sortField: 'name',          defaultW: 180 },
  { key: 'email',           label: 'Email',             defaultW: 200 },
  { key: 'phone',           label: 'Phone',             defaultW: 140 },
  { key: 'dateIn',          label: 'Date In',           sortField: 'dateIn',        defaultW: 100 },
  { key: 'callDate',        label: 'Call Date',         sortField: 'callDate',      defaultW: 155 },
  { key: 'callStatus',      label: 'Call Status',       defaultW: 130 },
  { key: 'callOutcome',     label: 'Outcome',           defaultW: 175 },
  { key: 'cashCollected',   label: 'Cash Collected',    sortField: 'cashCollected', defaultW: 130 },
  { key: 'closer',          label: 'Closer',            defaultW: 110 },
  { key: 'setter',          label: 'Setter',            defaultW: 110 },
  { key: 'leadQuality',     label: 'Lead Quality',      defaultW: 120 },
  { key: 'callQuality',     label: 'Call Quality',      defaultW: 120 },
  { key: 'setterRecording', label: 'Setter Recording',  defaultW: 120 },
  { key: 'salesRecording',  label: 'Sales Recording',   defaultW: 120 },
  { key: 'notes',           label: 'Notes',             defaultW: 200 },
  { key: 'calendar',        label: 'Calendar',          defaultW: 130 },
]

const DEFAULT_ORDER: ColKey[] = [
  'name', 'email', 'phone', 'dateIn', 'callDate',
  'callStatus', 'callOutcome', 'cashCollected',
  'leadQuality', 'callQuality',
  'setterRecording', 'salesRecording',
  'closer', 'setter', 'calendar', 'notes',
]
const DEFAULT_WIDTHS: Record<ColKey, number> = Object.fromEntries(ALL_COLS.map((c) => [c.key, c.defaultW])) as Record<ColKey, number>

const LS_ORDER  = 'appointments_colOrder_v2'
const LS_WIDTHS = 'appointments_colWidths_v2'

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
  return <span title={value} className={`block overflow-hidden text-ellipsis whitespace-nowrap ${className ?? ''}`}>{value}</span>
}

const STATUS_COLORS: Record<string, string> = {
  'Showed':      'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'No Show':     'bg-red-50 text-red-600 border border-red-200',
  'Call Booked': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Scheduled':   'bg-blue-50 text-blue-700 border border-blue-200',
  'Rescheduled': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Cancelled':   'bg-gray-100 text-gray-500 border border-gray-200',
  'Cancellation':'bg-gray-100 text-gray-500 border border-gray-200',
}
const OUTCOME_COLORS: Record<string, string> = {
  'WON':                 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Deposit Made':        'bg-teal-50 text-teal-700 border border-teal-200',
  'PIF':                 'bg-teal-50 text-teal-700 border border-teal-200',
  'Follow Up Scheduled': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Need To Follow Up':   'bg-blue-50 text-blue-700 border border-blue-200',
  'Not Sold':            'bg-red-50 text-red-600 border border-red-200',
  'Not Qualified':       'bg-gray-100 text-gray-500 border border-gray-200',
}
const QUALITY_COLORS: Record<string, string> = {
  'High Value':  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Qualified':   'bg-blue-50 text-blue-700 border border-blue-200',
  'So-So':       'bg-amber-50 text-amber-700 border border-amber-200',
  'Low Quality': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Bad Lead':    'bg-red-50 text-red-600 border border-red-200',
}
function Chip({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  if (!value) return null
  const cls = colorMap[value] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{value}</span>
}

function renderCell(row: AppointmentRow, key: ColKey): React.ReactNode {
  switch (key) {
    case 'name': {
      const full = [row.firstName, row.lastName].filter(Boolean).join(' ')
      return full ? <TruncCell value={full} className="font-medium text-gray-900" /> : null
    }
    case 'email':         return row.email        ? <TruncCell value={row.email} className="text-gray-500" /> : null
    case 'phone':         return row.phone        ? <span className="text-gray-500 whitespace-nowrap">{formatPhone(row.phone)}</span> : null
    case 'dateIn':        return row.dateIn       ? <span className="text-gray-500 whitespace-nowrap">{row.dateIn}</span> : null
    case 'callDate':      return row.callDate     ? <span className="text-gray-500 whitespace-nowrap">{row.callDate}</span> : null
    case 'callStatus':    return <Chip value={row.callStatus}  colorMap={STATUS_COLORS} />
    case 'callOutcome':   return <Chip value={row.callOutcome} colorMap={OUTCOME_COLORS} />
    case 'cashCollected': return parseMoney(row.cashCollected) > 0
      ? <span className="font-semibold text-emerald-700 whitespace-nowrap">{fmt(parseMoney(row.cashCollected))}</span> : null
    case 'closer':        return row.closer      ? <TruncCell value={row.closer}      className="text-gray-700" /> : null
    case 'setter':        return row.setter      ? <TruncCell value={row.setter}      className="text-gray-700" /> : null
    case 'leadQuality':   return <Chip value={row.leadQuality} colorMap={QUALITY_COLORS} />
    case 'callQuality':   return row.callQuality ? <TruncCell value={row.callQuality} className="text-gray-600" /> : null
    case 'setterRecording':
      return row.setterRecording
        ? <a href={row.setterRecording} target="_blank" rel="noreferrer" title={row.setterRecording}
             onClick={(e) => e.stopPropagation()}
             className="flex items-center gap-1 text-teal-600 hover:text-teal-800">
            <ExternalLink className="w-3.5 h-3.5 shrink-0" /><span className="truncate text-xs">Recording</span>
          </a> : null
    case 'salesRecording':
      return row.salesRecording
        ? <a href={row.salesRecording} target="_blank" rel="noreferrer" title={row.salesRecording}
             onClick={(e) => e.stopPropagation()}
             className="flex items-center gap-1 text-teal-600 hover:text-teal-800">
            <ExternalLink className="w-3.5 h-3.5 shrink-0" /><span className="truncate text-xs">Recording</span>
          </a> : null
    case 'notes':    return row.notes    ? <TruncCell value={row.notes}    className="text-gray-500" /> : null
    case 'calendar': return row.calendar ? <TruncCell value={row.calendar} className="text-gray-600" /> : null
    default: return null
  }
}

// ── Filters ───────────────────────────────────────────────────────────────────

function unique(rows: AppointmentRow[], fn: (r: AppointmentRow) => string) {
  return [...new Set(rows.map(fn).filter(Boolean))].sort()
}

function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function StatusMultiSelect({ options, selected, onChange, label: defaultLabel = 'All Statuses' }: {
  options: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(opt: string) {
    const next = new Set(selected)
    if (next.has(opt)) next.delete(opt)
    else next.add(opt)
    onChange(next)
  }

  const label = selected.size === 0
    ? defaultLabel
    : selected.size === 1
      ? [...selected][0]
      : `${selected.size} statuses`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 flex items-center gap-2 ${
          selected.size > 0 ? 'border-teal-400 text-teal-700' : 'border-gray-200 text-gray-700'
        }`}
      >
        {label}
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-400"
              />
              {opt}
            </label>
          ))}
          {selected.size > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={() => { onChange(new Set()); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-teal-600 hover:bg-gray-50 font-medium"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

function parseDateSort(val: string): number {
  if (!val) return 0
  const parts = val.split(/[\/\-]/)
  if (parts.length < 3) return 0
  if (parts[0].length <= 2) return parseInt(parts[2]) * 10000 + parseInt(parts[0]) * 100 + parseInt(parts[1])
  return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2])
}

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

export default function AppointmentsTable({ rows: rawRows, options }: { rows: AppointmentRow[]; options: ApptOptions }) {
  const [colOrder,  setColOrder]  = useState<ColKey[]>(DEFAULT_ORDER)
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)

  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set())
  const [filterOutcomes, setFilterOutcomes] = useState<Set<string>>(new Set())
  const [filterClosers,  setFilterClosers]  = useState<Set<string>>(new Set())
  const [search,         setSearch]         = useState('')

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('dateIn')
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc')

  // Which row is open in the modal (index into `paginated`)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  function handleSort(field: string) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

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

  // ── Filter + sort — carry originalIndex so we can write back to the correct sheet row
  const indexed = rawRows.map((row, originalIndex) => ({ row, originalIndex }))

  const filtered = indexed
    .filter(({ row }) => {
      const activeStatuses = filterStatuses.size > 0 ? filterStatuses : new Set(unique(rawRows, (r) => r.callStatus).filter((s) => s !== 'Rescheduled'))
      if (!activeStatuses.has(row.callStatus)) return false
      if (filterOutcomes.size > 0 && !filterOutcomes.has(row.callOutcome))    return false
      if (filterClosers.size  > 0 && !filterClosers.has(row.closer?.trim()))  return false
      if (search) {
        const q    = search.toLowerCase()
        const name = [row.firstName, row.lastName].join(' ').toLowerCase()
        if (!name.includes(q) && !row.email?.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      let diff = 0
      if (sortField === 'cashCollected') {
        diff = parseMoney(a.row.cashCollected) - parseMoney(b.row.cashCollected)
      } else if (sortField === 'name') {
        const na = [a.row.firstName, a.row.lastName].join(' ').toLowerCase()
        const nb = [b.row.firstName, b.row.lastName].join(' ').toLowerCase()
        diff = na.localeCompare(nb)
      } else if (sortField === 'callDate') {
        diff = parseDateSort(a.row.callDate) - parseDateSort(b.row.callDate)
      } else {
        diff = parseDateSort(a.row.dateIn) - parseDateSort(b.row.dateIn)
      }
      return sortDir === 'desc' ? -diff : diff
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const orderedCols = colOrder.map((k) => ALL_COLS.find((c) => c.key === k)!).filter(Boolean)

  const openEntry = openIdx !== null ? paginated[openIdx] : null

  return (
    <div>
      {/* Filters */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <input
          type="text" placeholder="Search name or email…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-52"
        />
        <StatusMultiSelect
          options={unique(rawRows, (r) => r.callStatus)}
          selected={filterStatuses}
          onChange={(s) => { setFilterStatuses(s); setPage(1) }}
        />
        <StatusMultiSelect
          options={unique(rawRows, (r) => r.callOutcome)}
          selected={filterOutcomes}
          onChange={(s) => { setFilterOutcomes(s); setPage(1) }}
          label="All Outcomes"
        />
        <StatusMultiSelect
          options={unique(rawRows, (r) => r.closer?.trim())}
          selected={filterClosers}
          onChange={(s) => { setFilterClosers(s); setPage(1) }}
          label="All Closers"
        />
        {(filterStatuses.size > 0 || filterOutcomes.size > 0 || filterClosers.size > 0 || search) && (
          <button
            onClick={() => { setFilterStatuses(new Set()); setFilterOutcomes(new Set()); setFilterClosers(new Set()); setSearch(''); setPage(1) }}
            className="text-xs text-teal-600 hover:text-teal-800 font-medium px-2 py-1.5"
          >
            Clear filters
          </button>
        )}

      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
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
                      ? <SortBtn label={col.label} field={col.sortField} sort={sortField} dir={sortDir} onSort={handleSort} />
                      : <span className="truncate text-gray-500 font-semibold">{col.label}</span>}
                  </span>
                  <div onMouseDown={(e) => startResize(e, col.key)}
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-teal-200 transition-colors rounded-sm" />
                </th>
              ))}
              {/* Sticky action header */}
              <th className="px-3 py-1.5 w-12 border border-gray-200 bg-gray-50 sticky right-0 z-30" />
            </tr>
          </thead>
          <tbody>
            {paginated.map(({ row }, i) => (
              <tr key={i}
                onClick={() => setOpenIdx(i)}
                className="hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                {orderedCols.map((col) => (
                  <td key={col.key} className="px-3 py-1.5 overflow-hidden border border-gray-200 whitespace-nowrap max-w-0">
                    {renderCell(row, col.key)}
                  </td>
                ))}
                {/* Sticky edit column */}
                <td
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 text-right border border-gray-200 bg-white sticky right-0 z-10"
                >
                  <button
                    onClick={() => setOpenIdx(i)}
                    className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Edit appointment"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={orderedCols.length + 1} className="py-10 text-center text-gray-400 border border-gray-200 whitespace-normal">
                  No appointments match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
        <span>Page {safePage} of {totalPages} &nbsp;·&nbsp; {filtered.length} of {rawRows.length} appointments</span>
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
        <ApptModal
          mode="edit"
          rowIndex={openEntry.originalIndex}
          initial={rowToFields(openEntry.row)}
          options={options}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </div>
  )
}
