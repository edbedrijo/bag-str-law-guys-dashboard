export const dynamic = 'force-dynamic'

const GHL_BASE = 'https://services.leadconnectorhq.com'

export interface AdSpendWeek {
  dateStart: string  // YYYY-MM-DD
  dateStop:  string
  spend:     number
}

export interface AdSpendResponse {
  weekly: AdSpendWeek[]
  totalSpend: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate   = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return Response.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }

  const pit        = process.env.GHL_PIT_STR
  const locationId = process.env.GHL_LOCATION_ID_STR

  if (!pit || !locationId) {
    return Response.json({ error: 'GHL credentials not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    locationId,
    fields: 'spend',
    groupBy: 'day',
    startDate,
    endDate,
    type: 'INTEGRATION',
  })

  const res = await fetch(`${GHL_BASE}/ad-publishing/facebook/reporting?${params}`, {
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Version': '2021-04-15',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    return Response.json({ error: `GHL API error ${res.status}`, detail: text }, { status: res.status })
  }

  const data = await res.json()

  const weekly: AdSpendWeek[] = (data.grouped ?? []).map((g: Record<string, string>) => ({
    dateStart: g.dateStart,
    dateStop:  g.dateStop,
    spend:     parseFloat(g.spend ?? '0') || 0,
  }))

  const totalSpend = weekly.reduce((sum, w) => sum + w.spend, 0)

  return Response.json({ weekly, totalSpend } satisfies AdSpendResponse)
}
