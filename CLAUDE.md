# CLAUDE.md — STR Law Guys Sales & Marketing Dashboard

## Project Overview
A live sales and marketing KPI dashboard for STR Law Guys, pulling data from their Google Sheets tracking spreadsheet and GHL CRM to display leads, call metrics, deals closed, and ad spend performance.

## Tech Stack
- **Frontend**: Next.js + React + Tailwind + shadcn/ui
- **Backend / API**: Supabase Edge Functions
- **Database**: Supabase Postgres (caching layer for Sheets data)
- **Auth**: Supabase Auth
- **Deployment**: Vercel

## Key Commands
- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Test**: `npm run test`
- **Lint**: `npm run lint`

## File Structure
```
src/
├── components/   – Reusable UI components (KPI cards, charts, tables)
├── pages/        – Route-level page components (Overview, Funnel, By Source, etc.)
├── lib/          – Google Sheets client, GHL API client, utility functions
├── hooks/        – Custom React hooks
└── types/        – TypeScript type definitions
```

## Architecture Notes
Data is sourced from the STR Law Guys Google Sheets Appointments tab and GHL CRM. The Google Sheets client uses a service account for read access. Supabase is used as a caching layer to avoid hitting the Sheets API on every request. Dashboard pages map 1:1 to the sidebar nav: Overview, Funnel, By Source, Weekly Calls, Sales Calls & Training, Closed Deals, Weekly Progress, Email Marketing, Social Media Marketing, Report Notes.

## Key Data Sources
- **Google Sheets**: Spreadsheet ID `1fbtPJNT7jcD1LBrIVsIdJePeRNwsDMAjS-ZDGqKuFOE` — Appointments tab (sheet ID `146168904`)
- **GHL CRM**: Location ID `juDyJd0r4rG1HB2SULYJ`, Main Pipeline ID `QrhT9D8C4WdbL8qNW2FT`
- **Service Account**: `str-dashboard@claude-api-498411.iam.gserviceaccount.com`

## Sheet Column Map (Appointments tab)
| Col | Field | Notes |
|-----|-------|-------|
| A | Contact Id | GHL contact ID |
| B | Appointment Id | GHL appointment ID |
| C | First Name | |
| D | Last Name | |
| E | Email | |
| F | Phone | |
| G | Date In | Date lead came in |
| H | Call Date (CDT) | Appointment datetime |
| I | Call Status | Call Booked, Showed, No Show, Rescheduled, Cancelled |
| J | Call Outcome | WON, Follow Up Scheduled, Deposit Made, PIF, Not Sold, Not Qualified, Need To Follow Up |
| K | Cash Collected | |
| L | Total Price | |
| M | Notes (Cash) | |
| N | Setter | |
| O | Closer | Jeff or Theresa |
| P | Lead Quality | Bad Lead, Low Quality, So-So, Qualified, High Value |
| Q | Call Quality | Bad Call, Weak Call, Average Call, Good Call, Excellent Call |
| R | Setter Call Recording | URL |
| S | Sales Call Recording | URL |
| T | Traffic Source | |
| U | UTM Source | |
| V | UTM Campaign | |
| W | UTM Medium | |
| X | UTM Content | |
| Y | Notes | |
| Z | Calendar | |

## GHL Opportunity Custom Field IDs
| Field | ID |
|-------|----|
| Call Outcome | `mAMJujmXjnwqMeTprVhl` |
| Cash Collected | `DTs2mZDdCBwpUXfKmau3` |
| Total Price | `5DzI30IFSRW498j3B9u7` |
| Notes (Cash) | `WWBIYsqduPf6kDzVD31o` |
| Lead Quality | `0NZW1cv3DD2dapyQdLx8` |
| Call Quality | `P5bfg7A5BiS81SObDX1r` |
| Setter Call Recording | `BVHnlKkW3ANUGzhTi29f` |
| Sales Call Recording | `aDDdavcLwjC2H1a2IPlA` |

## Team
- Setter: George Tariq
- Closers: Jeff, Theresa
- Ads / Marketing: Pedro Codo
- Subaccount Owner: Amy Wilcox
- Tech & Automations: Ed Bedrijo (Brickell Ads Group)

## Dashboard Pages
| Page | Description |
|------|-------------|
| Overview | Leads, calls booked, qualified calls, deals closed, cash collected, avg days to paid, ad spend MTD |
| Funnel | Lead → Booked → Showed → Closed conversion rates |
| By Source | Performance breakdown by traffic source (Paid Social, Referral, Organic) |
| Weekly Calls | Call activity grouped by week |
| Sales Calls & Training | Individual closer performance |
| Closed Deals | Deal list with cash collected, closer, call outcome |
| Weekly Progress | Week-over-week KPI progress |
| Email Marketing | Email campaign metrics |
| Social Media Marketing | Social media performance |
| Report Notes | Manual notes and commentary |

## UI Standards — Input Fields & Tables
> Apply these to every new form, modal, and data table built for this dashboard. Remind Ed of these rules whenever importing data from a sheet or building a new table.

### Input fields

**Phone**
- Numbers only — block all non-digit input
- Live format to `(xxx) xxx-xxxx` as user types; max 10 digits
- Use `inputMode="numeric"` + `type="tel"`

**Money (Amount, Cash Collected, any currency field)**
- Digits and one decimal point only — block letters
- Live comma formatting as user types: `898989` → `898,989`
- On blur: always finalize to 2 decimal places — `1000` → `1,000.00`, `5964.5` → `5,964.50`
- No `$` prefix inside the input itself
- Use the `MoneyField` component in `DealModal.tsx` as the reference implementation

**Dropdowns (for fields with known value sets)**
- Populate options from existing sheet data — never hardcode static lists
- Always include `+ Add New` at the bottom in teal (`text-teal-600`, `font-semibold`) — visually distinct from real options
- Selecting `+ Add New` reveals a text input + Add button; Enter key confirms
- Custom entries saved to `localStorage` per field and merged into the dropdown on next open
- If a record's current value isn't in the list (legacy data), still show it selected — never lose data
- Use the `SelectField` component in `DealModal.tsx` as the reference implementation

### Data tables

- **Blank cells**: show nothing — never use `—` as a placeholder
- **Long text**: truncate with `...` (`overflow-hidden text-ellipsis whitespace-nowrap max-w-0`); show full value on hover via `title` attribute
- **Column headers**: always left-aligned; `bg-gray-50`; `sticky top-0 z-20`
- **Cell padding**: `px-3 py-1.5` (compact rows)
- **Borders**: `border-collapse` on table; `border border-gray-200` on every `<th>` and `<td>`
- **Row hover**: `hover:bg-blue-50/40 cursor-pointer` — all rows are clickable to open edit modal
- **Edit column**: sticky right (`sticky right-0 z-10 bg-white`), always visible regardless of horizontal scroll; pencil icon (`Pencil` size 14) opens modal on click
- **Scroll container**: `overflow-x-auto` with `maxHeight: calc(100vh - Npx)` so horizontal scrollbar stays visible at bottom of table, not bottom of page
- **Filters**: use `StatusMultiSelect` (checkbox dropdown) for all filter controls — never single-select `<select>` dropdowns. Button shows "All X" when empty, the value when one selected, "N selected" when multiple. Turns teal when active. Includes a Clear button inside the dropdown. See `AppointmentsTable.tsx` as reference.
- **Pagination**: 20/50/100 per page dropdown; Prev / current page / Next footer; reset to page 1 on filter or sort change
- **Sort**: sortable columns show `ArrowUpDown` / `ArrowUp` / `ArrowDown` icons in header; click to toggle asc/desc
- **Column reorder**: drag via grip icon (`GripVertical`) on the left of each header; save order to `localStorage` with versioned key (bump version when default order changes)
- **Column resize**: drag right edge of header; enforce `min 60px`; save widths to `localStorage`
- **originalIndex tracking**: always map `rawRows` to `{ row, originalIndex }` before filtering/sorting so write-back API calls hit the correct sheet row
- **Sheet column reads**: always read the header row first and build a name→index map — never hardcode column positions
- **Default widths**: size columns so the table fills the container at default; use `minWidth: '100%'` on the table element
- **Modal**: rendered once at table level driven by `openIdx` state — not per-row; `ApptModal` / `DealModal` exported for this purpose
- Use `ClosedDealsTable.tsx` and `AppointmentsTable.tsx` as the reference implementations

## Environment Variables
- All secrets in `.env` (never committed — listed in `.gitignore`)
- See `.env.example` for required variable names and placeholder values

## Security
- See `SECURITY.md` for all security rules — they are non-negotiable
- RLS enabled on all database tables; every query scoped by org/user

## Git Workflow — ALWAYS follow this order
1. Commit changes and push to `dev` branch — NEVER commit directly to `master`
2. After pushing, tell Ed: **"Run `npm run dev` and open `http://localhost:3000` to verify"**
3. If Ed says it looks good, immediately merge `dev` → `master` and push — no extra confirmation needed
4. `master` is connected to Vercel production — every push triggers a deploy
5. Always tell Ed what to look at when verifying (which page, which section, what changed)

## Definition of Done
1. Behavior matches the request
2. No console or terminal errors
3. /review passes
4. Tests pass (if any exist) / test data verified
5. Changes pushed to `dev` and verified; merged to `master` only on Ed's go-ahead

## Current Status
- What's built so far: Overview page fully wired to Google Sheets (live data on reload)
- Components: KpiCard, MonthlyChart, CashBySourceDonut, LeadQualityChart, CashTrendChart, DateRangePicker
- Lib: sheets.ts (Leads + Appointments + CEO Dashboard), dateRange.ts
- In progress: Sales Calls & Training page, Weekly Progress page
- Known bugs: none
