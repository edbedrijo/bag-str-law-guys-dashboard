const GHL_BASE = 'https://services.leadconnectorhq.com'

export interface AdSpendDay {
  date:  string  // YYYY-MM-DD
  spend: number
}

function num(v: unknown): number {
  return parseFloat(String(v ?? 0)) || 0
}

function ghlHeaders(pit: string) {
  return { Authorization: `Bearer ${pit}`, Version: '2021-04-15' }
}

const ACCOUNT_TZ = 'America/Chicago'

function tzOffsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour === 24 ? 0 : +p.hour, +p.minute, +p.second)
  return asUTC - instant.getTime()
}

function zonedMs(dateStr: string, h: number, m: number, s: number, ms: number): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, m, s, ms)
  return guess - tzOffsetMs(new Date(guess), ACCOUNT_TZ)
}

function zonedDay(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCOUNT_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant)
}

// Fetches daily spend for one <=20-day chunk (same endpoint as Ad Spend page).
async function fetchOneChunk(pit: string, locationId: string, startDate: string, endDate: string): Promise<AdSpendDay[]> {
  const url = `${GHL_BASE}/ad-publishing/facebook/reporting`
    + `?locationId=${encodeURIComponent(locationId)}`
    + `&fields=spend`
    + `&groupBy=day`
    + `&startDate=${startDate}`
    + `&endDate=${endDate}`
    + `&type=INTEGRATION`
  const res = await fetch(url, { headers: ghlHeaders(pit), cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return ((data.grouped ?? []) as Record<string, string>[]).map((g) => ({
    date:  String(g.dateStart).slice(0, 10),
    spend: num(g.spend),
  }))
}

// Identical chunking logic to fetchDailyData in the API route —
// splits the range into <=20-day windows to avoid GHL's silent 25-day cap.
export async function getMonthlyAdSpend(year: number, month: number): Promise<{
  daily: AdSpendDay[]
  totalSpend: number
}> {
  const pit        = process.env.GHL_PIT_STR
  const locationId = process.env.GHL_LOCATION_ID_STR

  if (!pit || !locationId) {
    console.warn('[ghl] GHL_PIT_STR or GHL_LOCATION_ID_STR not set — ad spend will be 0')
    return { daily: [], totalSpend: 0 }
  }

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay   = new Date(year, month + 1, 0).getDate()
  const today     = new Date()
  const capDay    = today.getFullYear() === year && today.getMonth() === month
    ? today.getDate()
    : lastDay
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(capDay).padStart(2, '0')}`

  try {
    const MAX_CHUNK = 20
    const chunks: { start: string; end: string }[] = []
    const cur = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate   + 'T00:00:00')
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    while (cur <= end) {
      const cs = new Date(cur)
      const ce = new Date(cur)
      ce.setDate(ce.getDate() + MAX_CHUNK - 1)
      if (ce > end) ce.setTime(end.getTime())
      chunks.push({ start: fmt(cs), end: fmt(ce) })
      cur.setDate(cur.getDate() + MAX_CHUNK)
    }

    const results = await Promise.all(chunks.map((c) => fetchOneChunk(pit, locationId, c.start, c.end)))
    const daily = results.flat()
    const totalSpend = daily.reduce((sum, d) => sum + d.spend, 0)
    return { daily, totalSpend }
  } catch (err) {
    console.error('[ghl] ad spend fetch failed:', err)
    return { daily: [], totalSpend: 0 }
  }
}

export interface GHLLeads {
  total:  number
  byDate: Record<string, number>  // YYYY-MM-DD → count (account TZ day)
}

// Core: fetch CRM contacts tagged "ads" for any date range (YYYY-MM-DD strings).
// Same logic as Ad Spend page's fetchContactLeads — so all pages agree.
export async function getLeadsForRange(startDate: string, endDate: string): Promise<GHLLeads> {
  const pit        = process.env.GHL_PIT_STR
  const locationId = process.env.GHL_LOCATION_ID_STR

  if (!pit || !locationId) return { total: 0, byDate: {} }

  const gte = zonedMs(startDate, 0, 0, 0, 0)
  const lte = zonedMs(endDate,  23, 59, 59, 999)

  const byCampaign: Record<string, number> = {}
  const byDate:     Record<string, number> = {}
  const PAGE_LIMIT = 100
  const MAX_PAGES  = 20

  try {
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
        console.error('[ghl] contacts search error', res.status)
        return { total: 0, byDate: {} }
      }

      const data = await res.json()
      const contacts: Array<{
        dateAdded?: string
        attributionSource?:     { campaignId?: string }
        lastAttributionSource?: { campaignId?: string }
      }> = data.contacts ?? []

      for (const c of contacts) {
        const cid = c.attributionSource?.campaignId ?? c.lastAttributionSource?.campaignId
        if (!cid) continue
        byCampaign[cid] = (byCampaign[cid] ?? 0) + 1
        if (c.dateAdded) {
          const day = zonedDay(new Date(c.dateAdded))
          byDate[day] = (byDate[day] ?? 0) + 1
        }
      }

      if (contacts.length < PAGE_LIMIT) break
    }
  } catch (err) {
    console.error('[ghl] leads fetch failed:', err)
    return { total: 0, byDate: {} }
  }

  const total = Object.values(byCampaign).reduce((s, n) => s + n, 0)
  return { total, byDate }
}

// Convenience: current-month leads — used for MTD section (Cost/Lead, weekly table).
export async function getMonthlyLeads(year: number, month: number): Promise<GHLLeads> {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay   = new Date(year, month + 1, 0).getDate()
  const today     = new Date()
  const capDay    = today.getFullYear() === year && today.getMonth() === month
    ? today.getDate()
    : lastDay
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(capDay).padStart(2, '0')}`
  return getLeadsForRange(startDate, endDate)
}
