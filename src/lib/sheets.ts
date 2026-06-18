import { google } from 'googleapis'
import type { AppointmentRow, LeadRow } from '@/types/appointments'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!
const LEADS_RANGE = 'Leads!A2:N'
const APPOINTMENTS_RANGE = 'Appointments!A2:Z'

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

  const rows = res.data.values ?? []

  return rows.map((r) => ({
    contactId: r[0] ?? '',
    appointmentId: r[1] ?? '',
    firstName: r[2] ?? '',
    lastName: r[3] ?? '',
    email: r[4] ?? '',
    phone: r[5] ?? '',
    dateIn: r[6] ?? '',
    callDate: r[7] ?? '',
    callStatus: r[8] ?? '',
    callOutcome: r[9] ?? '',
    cashCollected: r[10] ?? '',
    totalPrice: r[11] ?? '',
    notesCash: r[12] ?? '',
    setter: r[13] ?? '',
    closer: r[14] ?? '',
    leadQuality: r[15] ?? '',
    callQuality: r[16] ?? '',
    setterRecording: r[17] ?? '',
    salesRecording: r[18] ?? '',
    trafficSource: r[19] ?? '',
    utmSource: r[20] ?? '',
    utmCampaign: r[21] ?? '',
    utmMedium: r[22] ?? '',
    utmContent: r[23] ?? '',
    notes: r[24] ?? '',
    calendar: r[25] ?? '',
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
