import PageHeader from '@/components/PageHeader'

const QA = [
  {
    q: 'Are duplicates removed so they don\'t over-count leads per Law Call?',
    a: 'Each contact is collapsed to a single record using their most-recent call. This removes 47 duplicate appointments — same contact, different call slots — keeping only the latest outcome.',
  },
  {
    q: 'Can we break out referral vs paid?',
    a: 'Yes — the Traffic Source field (col T) classifies each lead as Paid Social, Referral (partner link), or Organic. The Funnel and By Source pages split all metrics by these three buckets.',
  },
  {
    q: 'Cash collected — link for all, broken down by source?',
    a: 'Closed Deals shows the monthly cash-by-source table. Paid is Facebook ads, Referral is the partner link (currently the biggest revenue driver at ~69% of total), and Organic is direct / SEO.',
  },
  {
    q: 'Why don\'t we see 100 Qualified calls — what\'s the logic?',
    a: '"Qualified" means the prospect actually attended the strategy call (Call Status = Showed). No-shows, Cancelled, and Rescheduled are excluded. Of 172 booked calls, 110 showed — a 64% show rate.',
  },
  {
    q: 'Can the report sort by call date?',
    a: 'Yes — the Closed Deals table and Weekly Calls table are both sorted by call date. Oldest → newest so you can see the pipeline building over time.',
  },
  {
    q: 'Average days from strategy meeting to paid?',
    a: 'Currently 2.2 days across all won deals. Calculated as the gap between Date In (first contact) and Call Date for every WON row, then averaged.',
  },
  {
    q: 'Total calls booked per week, split by source?',
    a: 'The Weekly Calls page shows every calendar week with bookings, broken into Paid / Referral / Organic columns. Chart on top, sortable detail table below.',
  },
]

export default function ReportNotesPage() {
  return (
    <div>
      <PageHeader title="Report Notes" badge="Definitions · context · how things are built" />

      <div className="space-y-4">
        {QA.map((item, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-2">{item.q}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
