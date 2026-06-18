import PageHeader from '@/components/PageHeader'
import { Megaphone, MessageSquare } from 'lucide-react'

export default function SalesCallsPage() {
  return (
    <div>
      <PageHeader title="Sales Calls & Training" />

      {/* Coming soon banner */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3 mb-6">
        <Megaphone className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-teal-700">Update coming soon...</p>
          <p className="text-sm text-blue-600 mt-0.5">
            This tab will analyze recorded sales calls to surface objections, problems, and concerns.
            The Appointments sheet already captures a Fathom / Read.ai link for each call — those
            recordings will be transcribed and the findings rolled up here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Call analysis */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Call analysis</h2>
          <p className="text-sm text-gray-400 mb-4">Planned — populated in a future update</p>
          <ul className="space-y-2.5">
            {[
              'Common objections (price, timing, trust, spouse / partner buy-in)',
              'Recurring problems & pain points prospects raise',
              'Concerns and hesitations before closing',
              'Objection-handling notes and recommended responses',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-teal-600">
                <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Training & coaching */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Training & coaching</h2>
          <p className="text-sm text-gray-400 mb-4">Planned — populated in a future update</p>
          <ul className="space-y-2.5">
            {[
              'Transcribed calls sourced from the Fathom / Read.ai links on the Appointments tab',
              'Per-closer coaching themes (George, Jeff, Theresa)',
              'Wins and patterns from closed deals',
              'Talk-track improvements over time',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-teal-600">
                <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
