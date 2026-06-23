export const dynamic = 'force-dynamic'

const GHL_BASE = 'https://services.leadconnectorhq.com'

function num(v: unknown): number {
  return parseFloat(String(v ?? 0)) || 0
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

export interface AdRow {
  adId:        string
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const startDate  = searchParams.get('startDate')
  const endDate    = searchParams.get('endDate')

  if (!campaignId || !startDate || !endDate) {
    return Response.json({ error: 'campaignId, startDate, endDate required' }, { status: 400 })
  }

  const pit        = process.env.GHL_PIT_STR
  const locationId = process.env.GHL_LOCATION_ID_STR

  if (!pit || !locationId) {
    return Response.json({ error: 'GHL credentials not configured' }, { status: 500 })
  }

  const headers = { Authorization: `Bearer ${pit}`, Version: '2021-04-15' }

  // First get adsets for this campaign, then get ads per adset
  const adsetParams = new URLSearchParams({ locationId, listType: 'adsets', campaignId, startDate, endDate, type: 'INTEGRATION' })
  const adsetRes = await fetch(`${GHL_BASE}/ad-publishing/facebook/reporting/list?${adsetParams}`, {
    headers, cache: 'no-store',
  })

  if (!adsetRes.ok) {
    return Response.json({ error: `adset fetch failed ${adsetRes.status}` }, { status: adsetRes.status })
  }

  const adsetData = await adsetRes.json()
  const adsetList: Array<Record<string, unknown>> =
    Array.isArray(adsetData) ? adsetData :
    adsetData.adSets ?? adsetData.adsets ?? adsetData.data ?? []

  // Fetch ads for each adset in parallel
  const adsByAdset = await Promise.all(
    adsetList.map(async (adset) => {
      const adsetId = String(adset.adSetId ?? adset.adset_id ?? adset.id ?? '')
      if (!adsetId) return []

      const adParams = new URLSearchParams({ locationId, listType: 'ads', adSetId: adsetId, campaignId, startDate, endDate, type: 'INTEGRATION' })
      const adRes = await fetch(`${GHL_BASE}/ad-publishing/facebook/reporting/list?${adParams}`, {
        headers, cache: 'no-store',
      })

      if (!adRes.ok) {
        console.error('[ads] ad fetch failed', adRes.status, await adRes.text())
        return []
      }

      const adData = await adRes.json()
      const adList: Array<Record<string, unknown>> =
        Array.isArray(adData) ? adData : adData.ads ?? adData.data ?? []

      return adList.map((ad): AdRow => {
        const s  = num(ad.spend)
        const im = num(ad.impressions)
        const cl = num(ad.clicks)
        const le = num(ad.leads) || extractLeads(ad.results)
        return {
          adId:        String(ad.adId ?? ad.ad_id ?? ad.id ?? ''),
          name:        String(ad.name ?? ''),
          status:      String(ad.status ?? 'UNKNOWN'),
          spend:       s,
          impressions: im,
          clicks:      cl,
          leads:       le,
          cpc:         cl > 0 ? s / cl : 0,
          ctr:         im > 0 ? (cl / im) * 100 : 0,
          cpl:         le > 0 ? s / le : 0,
        }
      })
    })
  )

  // Deduplicate by adId, then filter to only ads with activity in the period (matches GHL)
  const seen = new Set<string>()
  const ads = adsByAdset.flat().filter((a) => {
    if (!a.adId || seen.has(a.adId)) return false
    seen.add(a.adId)
    return a.spend > 0 || a.clicks > 0 || a.impressions > 0
  })
  return Response.json({ ads })
}
