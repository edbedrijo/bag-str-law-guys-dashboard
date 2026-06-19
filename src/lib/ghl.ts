const GHL_BASE = 'https://services.leadconnectorhq.com'

export interface AdSpendDay {
  date:  string  // YYYY-MM-DD
  spend: number
}

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
  const endDate   = `${year}-${String(month + 1).padStart(2, '0')}-${String(capDay).padStart(2, '0')}`

  const params = new URLSearchParams({
    locationId,
    fields: 'spend',
    groupBy: 'day',
    startDate,
    endDate,
    type: 'INTEGRATION',
  })

  try {
    const res = await fetch(`${GHL_BASE}/ad-publishing/facebook/reporting?${params}`, {
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': '2021-04-15',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(`[ghl] ad spend API returned ${res.status}`)
      return { daily: [], totalSpend: 0 }
    }

    const data = await res.json()
    const daily: AdSpendDay[] = (data.grouped ?? []).map((g: Record<string, string>) => ({
      date:  g.dateStart,
      spend: parseFloat(g.spend ?? '0') || 0,
    }))

    const totalSpend = daily.reduce((sum, d) => sum + d.spend, 0)
    return { daily, totalSpend }
  } catch (err) {
    console.error('[ghl] ad spend fetch failed:', err)
    return { daily: [], totalSpend: 0 }
  }
}
