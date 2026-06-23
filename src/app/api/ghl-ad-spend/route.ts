export const dynamic = 'force-dynamic'

const GHL_BASE = 'https://services.leadconnectorhq.com'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyMetric {
  date:        string
  spend:       number
  impressions: number
  clicks:      number
}

export interface AdSetRow {
  adsetId:     string
  name:        string
  status:      string
  spend:       number
  impressions: number
  clicks:      number
  leads:       number
  cpc:         number
  ctr:         number
  cpl:         number
}

export interface CampaignRow {
  campaignId:  string
  name:        string
  status:      string
  budget:      number   // daily budget in account currency; 0 if not available
  spend:       number
  impressions: number
  clicks:      number
  leads:       number
  cpc:         number
  ctr:         number
  cpl:         number
  adsets:      AdSetRow[]
}

export interface AdSpendTotals {
  spend:       number
  impressions: number
  clicks:      number
  leads:       number
  cpc:         number
  ctr:         number
  cpl:         number
  totalBudget: number  // sum of campaign daily budgets; 0 if not available
}

export interface AdSpendResponse {
  daily:        DailyMetric[]
  leadsByDate:  Record<string, number>  // YYYY-MM-DD → count for chart
  totals:       AdSpendTotals
  priorTotals:  AdSpendTotals | null
  campaigns:    CampaignRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  return parseFloat(String(v ?? 0)) || 0
}

function ghlHeaders(pit: string) {
  return { Authorization: `Bearer ${pit}`, Version: '2021-04-15' }
}

function extractLeads(rawResults: unknown): number {
  if (Array.isArray(rawResults)) {
    return (rawResults as Array<{ actionType: string; value: string | number }>)
      .filter((r) => r.actionType === 'offsiteConversion.fbPixelLead')
      .reduce((s, r) => s + num(r.value), 0)
  }
  if (rawResults && typeof rawResults === 'object') {
    const o = rawResults as Record<string, string | number>
    return num(o['offsiteConversion.fbPixelLead'] ?? 0)
  }
  return 0
}

export interface ContactLeads {
  total:      number
  byCampaign: Record<string, number>  // campaignId → lead count
  byDate:     Record<string, number>  // YYYY-MM-DD → lead count
}

interface ContactRecord {
  dateAdded?:             string
  attributionSource?:     { campaignId?: string }
  lastAttributionSource?: { campaignId?: string }
}

// Counts contacts tagged "ads" created in the date range, grouped by attribution
// campaignId. Matches GHL's Meta Ads report "Leads" exactly and lets the campaign
// table use the same source as the KPI tile. Returns null if the API fails.
async function fetchContactLeads(
  pit: string,
  locationId: string,
  startDate: string,
  endDate: string,
): Promise<ContactLeads | null> {
  // STR Law Guys account timezone is CDT (UTC-5) — match GHL's day boundaries
  const gte = new Date(`${startDate}T00:00:00.000-05:00`).getTime()
  const lte = new Date(`${endDate}T23:59:59.999-05:00`).getTime()

  const byCampaign: Record<string, number> = {}
  const byDate:     Record<string, number> = {}
  let total = 0
  const PAGE_LIMIT = 100
  const MAX_PAGES  = 20  // safety cap (2,000 leads)

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${GHL_BASE}/contacts/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: 'v3',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        page,
        pageLimit: PAGE_LIMIT,
        filters: [
          { field: 'tags',      operator: 'contains', value: 'ads' },
          { field: 'dateAdded', operator: 'range',    value: { gte, lte } },
        ],
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('[ad-spend] contacts search error', res.status, await res.text())
      return null  // signal failure so caller can fall back to campaign-crawl leads
    }

    const data = await res.json()
    const contacts: ContactRecord[] = data.contacts ?? []

    for (const c of contacts) {
      const cid = c.attributionSource?.campaignId ?? c.lastAttributionSource?.campaignId
      if (!cid) continue
      byCampaign[cid] = (byCampaign[cid] ?? 0) + 1
      // dateAdded is an ISO string; extract YYYY-MM-DD in CDT (-05:00)
      if (c.dateAdded) {
        const day = new Date(new Date(c.dateAdded).getTime() - 5 * 60 * 60 * 1000)
          .toISOString().slice(0, 10)
        byDate[day] = (byDate[day] ?? 0) + 1
      }
    }

    if (contacts.length < PAGE_LIMIT) break  // last page reached
  }

  // Total = sum of campaign-attributed leads, so the tile matches the campaign table
  // and GHL's Meta Ads report (both exclude contacts with no FB campaign attribution).
  total = Object.values(byCampaign).reduce((s, n) => s + n, 0)

  return { total, byCampaign, byDate }
}

// Fetches aggregated totals for a date range (spend, impressions, clicks, cpc).
// Leads come from fetchContactLeads, not this endpoint.
async function fetchAggTotals(
  pit: string,
  locationId: string,
  startDate: string,
  endDate: string,
): Promise<{ spend: number; impressions: number; clicks: number } | null> {
  const url = `${GHL_BASE}/ad-publishing/facebook/reporting`
    + `?locationId=${encodeURIComponent(locationId)}`
    + `&fields=impressions,clicks,spend,cpc,ctr,conversions,cost_per_conversion`
    + `&groupBy=day`
    + `&startDate=${startDate}`
    + `&endDate=${endDate}`
    + `&type=INTEGRATION`

  const res = await fetch(url, { headers: ghlHeaders(pit), cache: 'no-store' })
  if (!res.ok) return null

  const data = await res.json()
  const t     = data.totals ?? {}
  const daily: Array<Record<string, string>> = data.grouped ?? []

  return {
    spend:       num(t.spend)       || daily.reduce((s, d) => s + num(d.spend), 0),
    impressions: num(t.impressions) || daily.reduce((s, d) => s + num(d.impressions), 0),
    clicks:      num(t.clicks)      || daily.reduce((s, d) => s + num(d.clicks), 0),
  }
}

// Fetches all campaigns and their adset-level metrics for a date range.
// Returns aggregated CampaignRow[] and total leads count.
async function fetchCampaignData(
  pit: string,
  locationId: string,
  startDate: string,
  endDate: string,
): Promise<{ campaigns: CampaignRow[]; totalLeads: number }> {
  const campParams = new URLSearchParams({ locationId, listType: 'campaigns', startDate, endDate, type: 'INTEGRATION' })
  const campRes = await fetch(`${GHL_BASE}/ad-publishing/facebook/reporting/list?${campParams}`, {
    headers: ghlHeaders(pit),
    cache: 'no-store',
  })

  if (!campRes.ok) return { campaigns: [], totalLeads: 0 }

  const campData = await campRes.json()
  const campList: Array<{ campaignId: string; name: string; status: string }> =
    campData.campaigns ?? campData.data ?? campData ?? []

  const campRaw: Array<Record<string, unknown>> = campData.campaigns ?? campData.data ?? campData ?? []

  const results = await Promise.all(
    campList.map(async (camp) => {
      const raw = campRaw.find((r) => r.campaignId === camp.campaignId) ?? {}
      const budget = num(raw.dailyBudget ?? raw.daily_budget ?? raw.budget ?? 0)

      const adsetParams = new URLSearchParams({
        locationId,
        listType: 'adsets',
        campaignId: camp.campaignId,
        startDate,
        endDate,
        type: 'INTEGRATION',
      })

      const adsetRes = await fetch(`${GHL_BASE}/ad-publishing/facebook/reporting/list?${adsetParams}`, {
        headers: ghlHeaders(pit),
        cache: 'no-store',
      })

      if (!adsetRes.ok) return null

      const adsetData = await adsetRes.json()
      const adsetList: Array<Record<string, unknown>> =
        adsetData.adSets ?? adsetData.adsets ?? adsetData.data ?? adsetData ?? []

      const active = adsetList.filter((a) => a.spend !== undefined && a.spend !== null)
      if (active.length === 0) return null

      let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalLeads = 0
      const adsets: AdSetRow[] = []

      for (const adset of active) {
        const s  = num(adset.spend)
        const im = num(adset.impressions)
        const cl = num(adset.clicks)
        const le = extractLeads(adset.results)
        totalSpend       += s
        totalImpressions += im
        totalClicks      += cl
        totalLeads       += le
        adsets.push({
          adsetId:     String(adset.adSetId ?? adset.adset_id ?? adset.id ?? ''),
          name:        String(adset.name ?? ''),
          status:      String(adset.status ?? 'UNKNOWN'),
          spend:       s,
          impressions: im,
          clicks:      cl,
          leads:       le,
          cpc:         cl > 0 ? s / cl : 0,
          ctr:         im > 0 ? (cl / im) * 100 : 0,
          cpl:         le > 0 ? s / le : 0,
        })
      }

      return {
        campaignId:  camp.campaignId,
        name:        camp.name,
        status:      camp.status ?? 'UNKNOWN',
        budget,
        spend:       totalSpend,
        impressions: totalImpressions,
        clicks:      totalClicks,
        leads:       totalLeads,
        cpc:         totalClicks > 0 ? totalSpend / totalClicks : 0,
        ctr:         totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpl:         totalLeads > 0 ? totalSpend / totalLeads : 0,
        adsets,
      } satisfies CampaignRow
    })
  )

  const campaigns = results.filter((r): r is CampaignRow => r !== null)
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
  return { campaigns, totalLeads }
}

// Fetches daily data for one chunk, CDT-aligned.
async function fetchOneDayChunk(
  pit: string,
  locationId: string,
  startDate: string,
  endDate: string,
): Promise<DailyMetric[]> {
  const url = `${GHL_BASE}/ad-publishing/facebook/reporting`
    + `?locationId=${encodeURIComponent(locationId)}`
    + `&fields=impressions,clicks,spend,cpc,ctr,conversions,cost_per_conversion`
    + `&groupBy=day`
    + `&startDate=${startDate}`
    + `&endDate=${endDate}`
    + `&type=INTEGRATION`

  const res = await fetch(url, { headers: ghlHeaders(pit), cache: 'no-store' })
  if (!res.ok) return []

  const data = await res.json()
  const rows = (data.grouped ?? []) as Record<string, string>[]
  // GHL buckets days in the account timezone already (the unshifted totals match
  // GHL's report), so use the returned day label as-is — no UTC shift.
  return rows.map((g): DailyMetric => ({
    date:        String(g.dateStart).slice(0, 10),
    spend:       num(g.spend),
    impressions: num(g.impressions),
    clicks:      num(g.clicks),
  }))
}

// For long ranges, chunks by month and aggregates daily results into monthly totals.
// For short ranges (≤31 days), single call returning daily data.
async function fetchDailyData(
  pit: string,
  locationId: string,
  startDate: string,
  endDate: string,
  aggregate: 'day' | 'month' = 'day',
): Promise<DailyMetric[]> {
  const start = new Date(startDate + 'T00:00:00')
  const end   = new Date(endDate   + 'T00:00:00')
  const days  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

  if (days <= 31) {
    return fetchOneDayChunk(pit, locationId, startDate, endDate)
  }

  // Build month chunks
  const chunks: { start: string; end: string }[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= end) {
    const chunkStart = cur < start ? startDate : cur.toISOString().slice(0, 10)
    const lastOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
    const chunkEnd = lastOfMonth > end ? endDate : lastOfMonth.toISOString().slice(0, 10)
    chunks.push({ start: chunkStart, end: chunkEnd })
    cur.setMonth(cur.getMonth() + 1)
  }

  // Fetch all chunks in parallel
  const results = await Promise.all(
    chunks.map((c) => fetchOneDayChunk(pit, locationId, c.start, c.end))
  )
  const allDaily = results.flat()

  if (aggregate === 'day') return allDaily

  // Aggregate into monthly totals keyed by first-of-month YYYY-MM-01
  const byMonth: Record<string, DailyMetric> = {}
  for (const d of allDaily) {
    const monthKey = d.date.slice(0, 7) + '-01'
    if (!byMonth[monthKey]) byMonth[monthKey] = { date: monthKey, spend: 0, impressions: 0, clicks: 0 }
    byMonth[monthKey].spend       += d.spend
    byMonth[monthKey].impressions += d.impressions
    byMonth[monthKey].clicks      += d.clicks
  }
  return Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date))
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate      = searchParams.get('startDate')
  const endDate        = searchParams.get('endDate')
  const priorStartDate = searchParams.get('priorStartDate')
  const priorEndDate   = searchParams.get('priorEndDate')
  const aggregate      = (searchParams.get('aggregate') ?? 'day') as 'day' | 'month'

  if (!startDate || !endDate) {
    return Response.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }

  const pit        = process.env.GHL_PIT_STR
  const locationId = process.env.GHL_LOCATION_ID_STR

  if (!pit || !locationId) {
    return Response.json({ error: 'GHL credentials not configured' }, { status: 500 })
  }

  const hasPrior = !!(priorStartDate && priorEndDate)

  const [daily, currentCamp, priorCamp, currentLeads, priorLeads] = await Promise.all([
    fetchDailyData(pit, locationId, startDate, endDate, aggregate),
    fetchCampaignData(pit, locationId, startDate, endDate),
    hasPrior ? fetchCampaignData(pit, locationId, priorStartDate!, priorEndDate!) : Promise.resolve(null),
    fetchContactLeads(pit, locationId, startDate, endDate),
    hasPrior ? fetchContactLeads(pit, locationId, priorStartDate!, priorEndDate!) : Promise.resolve(null),
  ])

  // Override per-campaign leads with GHL Contacts counts so the table matches the tile.
  // Falls back to the campaign-crawl pixel leads only if the contacts search failed.
  const campaigns: CampaignRow[] = currentCamp.campaigns.map((c) => {
    const contactLeads = currentLeads?.byCampaign[c.campaignId]
    if (contactLeads === undefined) return c
    return { ...c, leads: contactLeads, cpl: contactLeads > 0 ? c.spend / contactLeads : 0 }
  })

  // Tile totals derived from campaign rows — single source of truth so tiles and table always agree.
  // Aggregated API (Endpoint 1) is only used for the daily chart breakdown above.
  const totalSpend       = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks      = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalBudget      = campaigns.reduce((s, c) => s + c.budget, 0)
  const leads            = currentLeads?.total ?? currentCamp.totalLeads

  const totals: AdSpendTotals = {
    spend:       totalSpend,
    impressions: totalImpressions,
    clicks:      totalClicks,
    leads,
    cpc:         totalClicks > 0 ? totalSpend / totalClicks : 0,
    ctr:         totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpl:         leads > 0 ? totalSpend / leads : 0,
    totalBudget,
  }

  // Prior totals — also derived from campaign rows for consistency
  let priorTotals: AdSpendTotals | null = null
  if (hasPrior && priorCamp) {
    const pc   = priorCamp.campaigns
    const pSpend       = pc.reduce((s, c) => s + c.spend, 0)
    const pImpressions = pc.reduce((s, c) => s + c.impressions, 0)
    const pClicks      = pc.reduce((s, c) => s + c.clicks, 0)
    const pBudget      = pc.reduce((s, c) => s + c.budget, 0)
    const pLeads       = priorLeads?.total ?? priorCamp.totalLeads
    priorTotals = {
      spend:       pSpend,
      impressions: pImpressions,
      clicks:      pClicks,
      leads:       pLeads,
      cpc:         pClicks > 0 ? pSpend / pClicks : 0,
      ctr:         pImpressions > 0 ? (pClicks / pImpressions) * 100 : 0,
      cpl:         pLeads > 0 ? pSpend / pLeads : 0,
      totalBudget: pBudget,
    }
  }

  const leadsByDate = currentLeads?.byDate ?? {}
  return Response.json({ daily, leadsByDate, totals, priorTotals, campaigns } satisfies AdSpendResponse)
}
