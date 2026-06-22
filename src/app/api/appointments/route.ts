import { NextResponse } from 'next/server'
import { getAppointments } from '@/lib/sheets'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!
const SHEET_NAME     = 'Appointments'
const HEADER_ROW     = 1  // row 1 is the header
const DATA_START_ROW = 2  // data rows begin at row 2

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// Columns A-Z as defined in CLAUDE.md — order must match the sheet exactly
function buildRow(fields: Record<string, string>, preserved: string[]): string[] {
  // preserved = the original full row (A-Z) so GHL-managed fields are never lost
  const p = (i: number) => preserved[i] ?? ''
  return [
    p(0),                          // A: Contact Id (GHL-managed)
    p(1),                          // B: Appointment Id (GHL-managed)
    fields.firstName       ?? '',  // C
    fields.lastName        ?? '',  // D
    fields.email           ?? '',  // E
    fields.phone           ?? '',  // F
    fields.dateIn          ?? '',  // G
    fields.callDate        ?? '',  // H
    fields.callStatus      ?? '',  // I
    fields.callOutcome     ?? '',  // J
    fields.cashCollected   ?? '',  // K
    fields.totalPrice      ?? '',  // L
    fields.notesCash       ?? '',  // M
    fields.setter          ?? '',  // N
    fields.closer          ?? '',  // O
    fields.leadQuality     ?? '',  // P
    fields.callQuality     ?? '',  // Q
    fields.setterRecording ?? '',  // R
    fields.salesRecording  ?? '',  // S
    p(19),                         // T: Traffic Source (GHL-managed)
    p(20),                         // U: UTM Source (GHL-managed)
    p(21),                         // V: UTM Campaign (GHL-managed)
    p(22),                         // W: UTM Medium (GHL-managed)
    p(23),                         // X: UTM Content (GHL-managed)
    fields.notes           ?? '',  // Y
    fields.calendar        ?? '',  // Z
  ]
}

export async function GET() {
  try {
    const rows = await getAppointments()
    return NextResponse.json(rows)
  } catch (err) {
    console.error('appointments GET error', err)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

// POST — append a new appointment row
export async function POST(request: Request) {
  try {
    const body   = await request.json()
    const auth   = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const row    = buildRow(body, [])

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${DATA_START_ROW}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('appointments POST error', err)
    return NextResponse.json({ error: 'Failed to add appointment' }, { status: 500 })
  }
}

// PUT — update an existing appointment (rowIndex = 0-based position in data array)
export async function PUT(request: Request) {
  try {
    const body                  = await request.json()
    const { rowIndex, ...fields } = body
    const sheetRow              = DATA_START_ROW + rowIndex
    const auth                  = getAuth()
    const sheets                = google.sheets({ version: 'v4', auth })

    // Read the existing row so we can preserve GHL-managed columns
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${sheetRow}:Z${sheetRow}`,
    })
    const preserved = (existing.data.values?.[0] ?? []) as string[]
    const row       = buildRow(fields, preserved)

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${sheetRow}:Z${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('appointments PUT error', err)
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}

// DELETE — remove an appointment row entirely
export async function DELETE(request: Request) {
  try {
    const { rowIndex } = await request.json()
    const sheetRow     = DATA_START_ROW + rowIndex
    const auth         = getAuth()
    const sheets       = google.sheets({ version: 'v4', auth })

    const meta  = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const sheet = meta.data.sheets?.find((s) => s.properties?.title === SHEET_NAME)
    const sheetId = sheet?.properties?.sheetId
    if (sheetId == null) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: sheetRow - 1, endIndex: sheetRow },
          },
        }],
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('appointments DELETE error', err)
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 })
  }
}
