import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!
const DATA_START_ROW = 23  // first data row in the sheet

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function rowToValues(body: Record<string, string>, index: number): string[] {
  // Sheet cols: A=#, B=Client Name, C=Matter Type, D=Intake Date, E=Amount,
  //             F=Cash Collected, G=Referred By, H=Lead Source, I=Email, J=Phone
  return [
    String(index),
    body.clientName    ?? '',
    body.matterType    ?? '',
    body.intakeDate    ?? '',
    body.amount        ?? '',
    body.cashCollected ?? '',
    body.referredBy    ?? '',
    body.leadSource    ?? '',
    body.email         ?? '',
    body.phone         ?? '',
  ]
}

// POST — append a new deal
export async function POST(request: Request) {
  const body = await request.json()
  const auth   = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Count existing rows to assign next index number
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Closed Deals!A23:A',
  })
  const count = (existing.data.values ?? []).filter((r) => r[0] && r[0].trim() !== '').length
  const nextIndex = count + 1

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Closed Deals!A23',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowToValues(body, nextIndex)] },
  })

  return Response.json({ ok: true })
}

// PUT — update an existing deal by its 0-based array index
export async function PUT(request: Request) {
  const body      = await request.json()
  const { rowIndex, ...fields } = body  // rowIndex = 0-based position in data array
  const sheetRow  = DATA_START_ROW + rowIndex
  const range     = `Closed Deals!A${sheetRow}:J${sheetRow}`

  const auth   = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowToValues(fields, rowIndex + 1)] },
  })

  return Response.json({ ok: true })
}

// DELETE — remove a deal row entirely by its 0-based array index
export async function DELETE(request: Request) {
  const { rowIndex } = await request.json()
  const sheetRow = DATA_START_ROW + rowIndex  // 1-based sheet row number

  const auth   = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Look up the numeric sheetId for "Closed Deals" tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === 'Closed Deals')
  const sheetId = sheet?.properties?.sheetId
  if (sheetId == null) return Response.json({ ok: false, error: 'Sheet not found' }, { status: 404 })

  // Delete the single row (0-based startIndex = sheetRow - 1)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: sheetRow - 1,
            endIndex:   sheetRow,
          },
        },
      }],
    },
  })

  return Response.json({ ok: true })
}
