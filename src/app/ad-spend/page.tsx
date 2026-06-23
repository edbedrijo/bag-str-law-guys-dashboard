'use client'

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  DollarSign, Eye, MousePointer, Users, TrendingDown, BarChart2,
  Percent, ChevronDown, ChevronRight, Wallet,
} from 'lucide-react'
import KpiCard from '@/components/KpiCard'
import DateRangePicker from '@/components/DateRangePicker'
import PageHeader from '@/components/PageHeader'
import { getDateRange, getPriorRange, type DateRangePreset } from '@/lib/dateRange'
import type { AdSpendResponse, CampaignRow } from '@/app/api/ghl-ad-spend/route'
import type { AdRow } from '@/app/api/ghl-ad-spend/ads/route'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt$  (n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtN  (n: number) { return n.toLocaleString('en-US') }
function fmtPct(n: number) { return n.toFixed(2) + '%' }

function toISO({ year, month, day }: { year: number; month: number; day: number }) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Sort state ────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<CampaignRow, 'name' | 'spend' | 'impressions' | 'clicks' | 'leads' | 'cpc' | 'ctr' | 'cpl' | 'budget'>
type SortDir = 'asc' | 'desc'
type ChartMetric = 'spend' | 'impressions' | 'clicks' | 'leads'

const SORT_ICON = { none: '⇅', asc: '↑', desc: '↓' }

const LS_COL_WIDTHS = 'adspend_col_widths_v1'

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 260, status: 90, budget: 110,
  spend: 100, impressions: 110, clicks: 80,
  cpc: 80, ctr: 80, leads: 80, cpl: 90,
}

function loadWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_COL_WIDTHS)
    return raw ? { ...DEFAULT_WIDTHS, ...JSON.parse(raw) } : { ...DEFAULT_WIDTHS }
  } catch { return { ...DEFAULT_WIDTHS } }
}

const CHART_OPTIONS: { key: ChartMetric; label: string; color: string; fmt: (n: number) => string }[] = [
  { key: 'spend',       label: 'Spend',       color: '#14b8a6', fmt: fmt$ },
  { key: 'impressions', label: 'Impressions',  color: '#3b82f6', fmt: fmtN },
  { key: 'clicks',      label: 'Clicks',       color: '#8b5cf6', fmt: fmtN },
  { key: 'leads',       label: 'Leads',        color: '#f59e0b', fmt: fmtN },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
      active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
      {status}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

function AdSpendInner() {
  const searchParams = useSearchParams()
  const preset = (searchParams.get('range') ?? 'this_month') as DateRangePreset

  const [data,        setData]        = useState<AdSpendResponse | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [sortKey,     setSortKey]     = useState<SortKey>('spend')
  const [sortDir,     setSortDir]     = useState<SortDir>('desc')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('spend')
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set())
  const [adRows,      setAdRows]      = useState<Record<string, AdRow[]>>({})   // campaignId → ads
  const [adLoading,   setAdLoading]   = useState<Set<string>>(new Set())
  const [colWidths,   setColWidths]   = useState<Record<string, number>>(DEFAULT_WIDTHS)
  const resizeRef = useRef<{ col: string; startX: number; startW: number } | null>(null)

  // Load saved widths from localStorage after mount (avoids SSR mismatch)
  useEffect(() => { setColWidths(loadWidths()) }, [])

  function startResize(col: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = { col, startX: e.clientX, startW: colWidths[col] ?? DEFAULT_WIDTHS[col] ?? 80 }

    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return
      const { col: c, startX, startW } = resizeRef.current
      const newW = Math.max(60, startW + ev.clientX - startX)
      setColWidths((prev) => ({ ...prev, [c]: newW }))
    }

    function onUp() {
      if (resizeRef.current) {
        const { col: c } = resizeRef.current
        setColWidths((prev) => {
          const next = { ...prev }
          try { localStorage.setItem(LS_COL_WIDTHS, JSON.stringify(next)) } catch {}
          return next
        })
      }
      resizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const range      = getDateRange(preset)
    const priorRange = getPriorRange(preset)
    const start      = toISO(range.start)
    const end        = toISO(range.end)
    const priorStart = toISO(priorRange.start)
    const priorEnd   = toISO(priorRange.end)
    try {
      const isYearly = preset === 'this_year' || preset === 'last_year'
      const res = await fetch(
        `/api/ghl-ad-spend?startDate=${start}&endDate=${end}&priorStartDate=${priorStart}&priorEndDate=${priorEnd}${isYearly ? '&aggregate=month' : ''}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [preset])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Sort campaigns ─────────────────────────────────────────────────────────
  const campaigns = [...(data?.campaigns ?? [])].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function sortIcon(key: SortKey) {
    if (key !== sortKey) return SORT_ICON.none
    return sortDir === 'asc' ? SORT_ICON.asc : SORT_ICON.desc
  }

  function toggleExpand(campaignId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(campaignId)) { next.delete(campaignId); return next }
      next.add(campaignId)
      return next
    })
    // Fetch ads on first expand
    if (!adRows[campaignId] && !adLoading.has(campaignId)) {
      const range = getDateRange(preset)
      const start = toISO(range.start)
      const end   = toISO(range.end)
      setAdLoading((prev) => new Set(prev).add(campaignId))
      fetch(`/api/ghl-ad-spend/ads?campaignId=${campaignId}&startDate=${start}&endDate=${end}`)
        .then((r) => r.json())
        .then((body) => {
          setAdRows((prev) => ({ ...prev, [campaignId]: body.ads ?? [] }))
        })
        .finally(() => {
          setAdLoading((prev) => { const s = new Set(prev); s.delete(campaignId); return s })
        })
    }
  }

  const totals     = data?.totals
  const prior      = data?.priorTotals
  const priorLabel = getPriorRange(preset).label
  const hasBudget  = (totals?.totalBudget ?? 0) > 0

  function delta(curr: number | undefined, prev: number | undefined, invert = false) {
    if (curr == null || prev == null || prev === 0) return undefined
    const diff = parseFloat((curr - prev).toFixed(2))
    const pct  = (diff / prev) * 100
    return { diff, pct, label: priorLabel, invert }
  }

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartOption = CHART_OPTIONS.find((o) => o.key === chartMetric)!

  const leadsByDate = data?.leadsByDate ?? {}

  const isMonthly  = preset === 'this_year' || preset === 'last_year'
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // Index API data by date string for quick lookup
  const apiByDate: Record<string, { spend: number; clicks: number; impressions: number }> = {}
  for (const d of data?.daily ?? []) {
    apiByDate[d.date] = { spend: d.spend, clicks: d.clicks, impressions: d.impressions }
  }

  const range      = getDateRange(preset)
  const rangeStart = new Date(range.start.year, range.start.month, range.start.day)
  const rangeEnd   = new Date(range.end.year,   range.end.month,   range.end.day)
  const chartData: { label: string; spend: number; impressions: number; clicks: number; leads: number }[] = []

  if (isMonthly) {
    // One slot per calendar month in the range
    const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    while (cur <= rangeEnd) {
      const iso      = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-01`
      const nextIso  = (() => { const n = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01` })()
      const label    = MONTHS_SHORT[cur.getMonth()]
      const day      = apiByDate[iso] ?? { spend: 0, clicks: 0, impressions: 0 }
      const monthLeads = Object.entries(leadsByDate)
        .filter(([d]) => d >= iso && d < nextIso)
        .reduce((s, [, n]) => s + n, 0)
      chartData.push({ label, spend: day.spend, clicks: day.clicks, impressions: day.impressions, leads: monthLeads })
      cur.setMonth(cur.getMonth() + 1)
    }
  } else {
    // One slot per calendar day in the range
    for (const cur = new Date(rangeStart); cur <= rangeEnd; cur.setDate(cur.getDate() + 1)) {
      // Key by local date parts (not toISOString, which converts to UTC and shifts
      // the day for east-of-UTC viewers, misaligning every slot by one).
      const iso   = toISO({ year: cur.getFullYear(), month: cur.getMonth(), day: cur.getDate() })
      const label = `${cur.getMonth() + 1}/${cur.getDate()}`
      const day   = apiByDate[iso] ?? { spend: 0, clicks: 0, impressions: 0 }
      chartData.push({ label, spend: day.spend, clicks: day.clicks, impressions: day.impressions, leads: leadsByDate[iso] ?? 0 })
    }
  }

  // ── Ad row ────────────────────────────────────────────────────────────────
  function AdRowEl({ a, hasBgt }: { a: AdRow; hasBgt: boolean }) {
    return (
      <tr className="bg-gray-50/60 hover:bg-blue-50/30">
        <td className="pl-10 pr-3 py-1 border border-gray-200 text-gray-600 text-xs max-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={a.name}>
          ↳ {a.name}
        </td>
        <td className="px-3 py-1 border border-gray-200 text-xs text-gray-400">—</td>
        {hasBgt && <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-400">—</td>}
        <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-600">{fmt$(a.spend)}</td>
        <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-600">{fmtN(a.impressions)}</td>
        <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-600">{fmtN(a.clicks)}</td>
        <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-600">{fmt$(a.cpc)}</td>
        <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-600">{fmtPct(a.ctr)}</td>
        <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-600">{a.leads > 0 ? fmtN(a.leads) : ''}</td>
        <td className="px-3 py-1 border border-gray-200 text-right text-xs text-gray-600">{a.leads > 0 ? fmt$(a.cpl) : ''}</td>
      </tr>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ad Spend</h1>
        <div className="flex flex-col items-end gap-1">
          <DateRangePicker current={preset} />
          <span className="text-[11px] text-gray-400">
            {(() => {
              const r = getDateRange(preset)
              const fmt = (p: { year: number; month: number; day: number }) =>
                new Date(p.year, p.month, p.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return `${fmt(r.start)} – ${fmt(r.end)}`
            })()}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load ad data: {error}
        </div>
      )}

      {/* KPI tiles */}
      <div className={`grid gap-3 ${hasBudget ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'}`}>
        <KpiCard
          label="Total Spend"
          value={loading ? '—' : fmt$(totals?.spend ?? 0)}
          icon={DollarSign}
          iconColor="text-emerald-500"
          delta={delta(totals?.spend, prior?.spend, true)}
        />
        {hasBudget && (
          <KpiCard
            label="Budget Used"
            value={loading ? '—' : (totals?.totalBudget ? fmtPct((totals.spend / totals.totalBudget) * 100) : '—')}
            icon={Wallet}
            iconColor="text-amber-500"
          />
        )}
        <KpiCard
          label="Impressions"
          value={loading ? '—' : fmtN(totals?.impressions ?? 0)}
          icon={Eye}
          iconColor="text-blue-500"
          delta={delta(totals?.impressions, prior?.impressions)}
        />
        <KpiCard
          label="Clicks"
          value={loading ? '—' : fmtN(totals?.clicks ?? 0)}
          icon={MousePointer}
          iconColor="text-violet-500"
          delta={delta(totals?.clicks, prior?.clicks)}
        />
        <KpiCard
          label="CTR"
          value={loading ? '—' : fmtPct(totals?.ctr ?? 0)}
          icon={Percent}
          iconColor="text-sky-500"
          delta={delta(totals?.ctr, prior?.ctr)}
        />
        <KpiCard
          label="Leads"
          value={loading ? '—' : fmtN(totals?.leads ?? 0)}
          icon={Users}
          iconColor="text-teal-500"
          delta={delta(totals?.leads, prior?.leads)}
        />
        <KpiCard
          label="Avg CPC"
          value={loading ? '—' : fmt$(totals?.cpc ?? 0)}
          icon={BarChart2}
          iconColor="text-orange-500"
          delta={delta(totals?.cpc, prior?.cpc, true)}
        />
        <KpiCard
          label="Cost per Lead"
          value={loading ? '—' : (totals?.leads ? fmt$(totals.cpl) : '—')}
          icon={TrendingDown}
          iconColor="text-pink-500"
          delta={delta(totals?.cpl, prior?.cpl, true)}
        />
      </div>

      {/* Daily chart */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{isMonthly ? 'Monthly' : 'Daily'} {chartOption.label}</p>
          <div className="flex gap-1">
            {CHART_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setChartMetric(o.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  chartMetric === o.key
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                style={chartMetric === o.key ? { backgroundColor: o.color } : {}}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chartOption.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartOption.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => {
                  if (chartMetric === 'spend') return '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0))
                  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v)
                }}
                width={52}
              />
              <Tooltip
                formatter={(value) => [chartOption.fmt(Number(value ?? 0)), chartOption.label]}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e5e7eb' }}
              />
              <Area
                type="linear"
                dataKey={chartMetric}
                stroke={chartOption.color}
                strokeWidth={2}
                fill="url(#chartGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Campaign spend bar chart */}
      {!loading && campaigns.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Spend by Campaign</p>
          <ResponsiveContainer width="100%" height={campaigns.length * 40 + 16}>
            <BarChart
              layout="vertical"
              data={campaigns.map((c) => ({
                name: c.name.length > 40 ? c.name.slice(0, 40) + '…' : c.name,
                fullName: c.name,
                campaignId: c.campaignId,
                spend: c.spend,
              }))}
              margin={{ top: 0, right: 80, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0))}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={220}
              />
              <Tooltip
                formatter={(value) => [fmt$(Number(value ?? 0)), 'Spend']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e5e7eb' }}
                cursor={{ fill: '#f0fdfa' }}
              />
              <Bar dataKey="spend" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: unknown) => fmt$(Number(v ?? 0)) }}>
                {campaigns.map((c) => (
                  <Cell
                    key={c.campaignId}
                    fill="#14b8a6"
                    opacity={expanded.has(c.campaignId) ? 1 : 0.75}
                    cursor="pointer"
                    onClick={() => toggleExpand(c.campaignId)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign table */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Campaigns <span className="text-gray-400 font-normal normal-case ml-1">— click a row to expand ad sets</span>
          </p>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 520px)' }}>
          <table className="w-full border-collapse text-sm" style={{ minWidth: '100%' }}>
            <thead>
              <tr className="bg-gray-50 sticky top-0 z-20">
                {([
                  ['name',        'Campaign',    'text-left'],
                  ['status',      'Status',      'text-left'],
                  ...(hasBudget ? [['budget', 'Daily Budget', 'text-right']] : []),
                  ['spend',       'Spend',       'text-right'],
                  ['impressions', 'Impressions', 'text-right'],
                  ['clicks',      'Clicks',      'text-right'],
                  ['cpc',         'CPC',         'text-right'],
                  ['ctr',         'CTR',         'text-right'],
                  ['leads',       'Leads',       'text-right'],
                  ['cpl',         'CPL',         'text-right'],
                ] as [SortKey | 'status', string, string][]).map(([key, label, align]) => (
                  <th
                    key={key}
                    onClick={() => key !== 'status' && handleSort(key as SortKey)}
                    className={`relative px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border border-gray-200 ${align} ${key !== 'status' ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                    style={{ width: colWidths[key] ?? DEFAULT_WIDTHS[key], minWidth: 60 }}
                  >
                    {label} {key !== 'status' && <span className="text-gray-300 ml-0.5">{sortIcon(key as SortKey)}</span>}
                    {/* resize handle */}
                    <span
                      onMouseDown={(e) => startResize(key, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-teal-400/40 z-10"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={hasBudget ? 10 : 9} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={hasBudget ? 10 : 9} className="px-4 py-8 text-center text-sm text-gray-400">No campaign data for this period</td></tr>
              ) : (
                campaigns.map((c) => {
                  const isOpen = expanded.has(c.campaignId)
                  return (
                    <React.Fragment key={c.campaignId}>
                      <tr
                        key={c.campaignId}
                        className="hover:bg-blue-50/40 cursor-pointer"
                        onClick={() => toggleExpand(c.campaignId)}
                      >
                        <td className="px-3 py-1.5 border border-gray-200 text-gray-800 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={c.name}>
                          <span className="inline-flex items-center gap-1">
                            {isOpen
                              ? <ChevronDown size={12} className="text-gray-400 shrink-0" />
                              : <ChevronRight size={12} className="text-gray-400 shrink-0" />
                            }
                            {c.name}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 border border-gray-200"><StatusBadge status={c.status} /></td>
                        {hasBudget && (
                          <td className="px-3 py-1.5 border border-gray-200 text-right font-medium text-gray-700">
                            {c.budget > 0 ? fmt$(c.budget) : '—'}
                          </td>
                        )}
                        <td className="px-3 py-1.5 border border-gray-200 text-right font-medium text-gray-800">{fmt$(c.spend)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right text-gray-700">{fmtN(c.impressions)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right text-gray-700">{fmtN(c.clicks)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right text-gray-700">{fmt$(c.cpc)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right text-gray-700">{fmtPct(c.ctr)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right text-gray-700">{fmtN(c.leads)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right text-gray-700">{c.leads > 0 ? fmt$(c.cpl) : ''}</td>
                      </tr>
                      {isOpen && adLoading.has(c.campaignId) && (
                        <tr key={`${c.campaignId}-loading`}>
                          <td colSpan={hasBudget ? 10 : 9} className="px-10 py-2 text-xs text-gray-400 border border-gray-200">
                            Loading ads…
                          </td>
                        </tr>
                      )}
                      {isOpen && !adLoading.has(c.campaignId) && (adRows[c.campaignId] ?? []).map((a) => (
                        <AdRowEl key={a.adId || a.name} a={a} hasBgt={hasBudget} />
                      ))}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AdSpendPage() {
  return (
    <Suspense>
      <AdSpendInner />
    </Suspense>
  )
}
