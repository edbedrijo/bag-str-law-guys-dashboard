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

## Environment Variables
- All secrets in `.env` (never committed — listed in `.gitignore`)
- See `.env.example` for required variable names and placeholder values

## Security
- See `SECURITY.md` for all security rules — they are non-negotiable
- RLS enabled on all database tables; every query scoped by org/user

## Definition of Done
1. Behavior matches the request
2. No console or terminal errors
3. /review passes
4. Tests pass (if any exist) / test data verified
5. Changes committed via /commit

## Current Status
- What's built so far: nothing yet — initial scaffold
- What's in progress: filling out project templates and PRD
- Known bugs: none
