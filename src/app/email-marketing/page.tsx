import PageHeader from '@/components/PageHeader'
import { Megaphone, Mail } from 'lucide-react'

export default function EmailMarketingPage() {
  return (
    <div>
      <PageHeader title="Email Marketing" />

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3 mb-6">
        <Megaphone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-700">Update coming soon...</p>
          <p className="text-sm text-amber-600 mt-0.5">
            Email campaign performance will live here once data starts flowing in.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-sm">
        <h2 className="text-base font-semibold text-gray-900">Campaign metrics</h2>
        <p className="text-sm text-gray-400 mb-4">Planned — populated in a future update</p>
        <ul className="space-y-2.5">
          {['Emails sent', 'Open rates', 'Booking rates', 'Campaign name / subject line'].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-teal-600">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
