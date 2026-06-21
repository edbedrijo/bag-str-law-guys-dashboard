import { google } from 'googleapis'
import type { AppointmentRow, LeadRow } from '@/types/appointments'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!
const LEADS_RANGE = 'Leads!A2:N'
const APPOINTMENTS_RANGE = 'Appointments!A1:Z'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

export async function getLeads(): Promise<LeadRow[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: LEADS_RANGE,
  })

  const rows = res.data.values ?? []
  return rows.map((r) => ({
    contactId: r[0] ?? '',
    dateIn: r[1] ?? '',
    dateCreated: r[2] ?? '',
    firstName: r[3] ?? '',
    lastName: r[4] ?? '',
    email: r[5] ?? '',
    phone: r[6] ?? '',
    trafficSource: r[7] ?? '',
    utmSource: r[8] ?? '',
    utmCampaign: r[9] ?? '',
    utmMedium: r[10] ?? '',
    utmContent: r[11] ?? '',
    notes: r[12] ?? '',
    bookedACall: r[13] ?? '',
  }))
}

export async function getAppointments(): Promise<AppointmentRow[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: APPOINTMENTS_RANGE,
  })

  const allRows = res.data.values ?? []
  if (allRows.length < 2) return []

  // Build name → index map from header row so column positions never need to be hardcoded
  const headers = allRows[0] as string[]
  const col = (name: string) => headers.findIndex((h) => h?.trim() === name)

  const iContactId       = col('Contact Id')
  const iAppointmentId   = col('Appointment Id')
  const iFirstName       = col('First Name')
  const iLastName        = col('Last Name')
  const iEmail           = col('Email')
  const iPhone           = col('Phone')
  const iDateIn          = col('Date In')
  const iCallDate        = col('Call Date (CDT)')
  const iCallStatus      = col('Call Status')
  const iCallOutcome     = col('Call Outcome')
  const iCashCollected   = col('Cash Collected')
  const iTotalPrice      = col('Total Price')
  const iNotesCash       = col('Notes (Cash)')
  const iSetter          = col('Setter')
  const iCloser          = col('Closer')
  const iLeadQuality     = col('Lead Quality')
  const iCallQuality     = col('Call Quality')
  const iSetterRecording = col('Setter Call Recording')
  const iSalesRecording  = col('Sales Call Recording')
  const iTrafficSource   = col('Traffic Source')
  const iUtmSource       = col('UTM Source')
  const iUtmCampaign     = col('UTM Campaign')
  const iUtmMedium       = col('UTM Medium')
  const iUtmContent      = col('UTM Content')
  const iNotes           = col('Notes')
  const iCalendar        = col('Calendar')

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '') : '')

  return allRows.slice(1).map((r) => ({
    contactId:       get(r, iContactId),
    appointmentId:   get(r, iAppointmentId),
    firstName:       get(r, iFirstName),
    lastName:        get(r, iLastName),
    email:           get(r, iEmail),
    phone:           get(r, iPhone),
    dateIn:          get(r, iDateIn),
    callDate:        get(r, iCallDate),
    callStatus:      get(r, iCallStatus),
    callOutcome:     get(r, iCallOutcome),
    cashCollected:   get(r, iCashCollected),
    totalPrice:      get(r, iTotalPrice),
    notesCash:       get(r, iNotesCash),
    setter:          get(r, iSetter),
    closer:          get(r, iCloser),
    leadQuality:     get(r, iLeadQuality),
    callQuality:     get(r, iCallQuality),
    setterRecording: get(r, iSetterRecording),
    salesRecording:  get(r, iSalesRecording),
    trafficSource:   get(r, iTrafficSource),
    utmSource:       get(r, iUtmSource),
    utmCampaign:     get(r, iUtmCampaign),
    utmMedium:       get(r, iUtmMedium),
    utmContent:      get(r, iUtmContent),
    notes:           get(r, iNotes),
    calendar:        get(r, iCalendar),
  }))
}

export interface ClosedDealRow {
  clientName:     string
  matterType:     string
  intakeDate:     string
  amount:         string
  cashCollected:  string
  referredBy:     string
  leadSource:     string
  email:          string
  phone:          string
}

export async function getClosedDeals(): Promise<ClosedDealRow[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Fetch header row (row 22) + all data rows together so column positions
  // are derived from names, not hardcoded indices — safe against sheet reordering.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Closed Deals!A22:Z',
  })

  const allRows = res.data.values ?? []
  if (allRows.length < 2) return []

  // Build name → index map from header row
  const headers = allRows[0] as string[]
  const col = (name: string) => headers.findIndex((h) => h?.trim() === name)

  const iClientName    = col('Client Name')
  const iMatterType    = col('Matter Type')
  const iIntakeDate    = col('Intake Date')
  const iAmount        = col('Amount')
  const iCashCollected = col('Cash Collected')
  const iReferredBy    = col('Referred By')
  const iLeadSource    = col('Lead Source')
  const iEmail         = col('Email')
  const iPhone         = col('Phone')

  const dataRows = allRows.slice(1)
  return dataRows
    .filter((r) => iClientName >= 0 && r[iClientName]?.trim())
    .map((r) => ({
      clientName:    r[iClientName]    ?? '',
      matterType:    r[iMatterType]    ?? '',
      intakeDate:    r[iIntakeDate]    ?? '',
      amount:        r[iAmount]        ?? '',
      cashCollected: iCashCollected >= 0 ? (r[iCashCollected] ?? '') : '',
      referredBy:    iReferredBy >= 0   ? (r[iReferredBy]    ?? '') : '',
      leadSource:    iLeadSource >= 0   ? (r[iLeadSource]    ?? '') : '',
      email:         iEmail >= 0        ? (r[iEmail]         ?? '') : '',
      phone:         iPhone >= 0        ? (r[iPhone]         ?? '') : '',
    }))
}

export interface CeoDashRow {
  period:      string
  adSpend:     number
  leads:       number
  booked:      number
  showed:      number
  noShows:     number
  cancelled:   number
  showRate:    string
  dealsWon:    number
  revenue:     number
  avgDeal:     number
  cpl:         number
  costPerShow: number
  closeRate:   string
}

export async function getCeoDashboard(): Promise<{ weekly: CeoDashRow[]; monthly: CeoDashRow[] }> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const [weeklyRes, monthlyRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'CEO Dashboard!A10:N14' }),
    sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'CEO Dashboard!A19:N30' }),
  ])

  function toRow(r: string[]): CeoDashRow {
    const n = (v: string) => parseFloat((v ?? '').replace(/[$,%]/g, '')) || 0
    return {
      period:      r[0]  ?? '',
      adSpend:     n(r[1]  ?? ''),
      leads:       n(r[2]  ?? ''),
      booked:      n(r[3]  ?? ''),
      showed:      n(r[4]  ?? ''),
      noShows:     n(r[5]  ?? ''),
      cancelled:   n(r[6]  ?? ''),
      showRate:    r[7]  ?? '0%',
      dealsWon:    n(r[8]  ?? ''),
      revenue:     n(r[9]  ?? ''),
      avgDeal:     n(r[10] ?? ''),
      cpl:         n(r[11] ?? ''),
      costPerShow: n(r[12] ?? ''),
      closeRate:   r[13] ?? '0%',
    }
  }

  return {
    weekly:  (weeklyRes.data.values  ?? []).map((r) => toRow(r as string[])),
    monthly: (monthlyRes.data.values ?? []).map((r) => toRow(r as string[])),
  }
}
