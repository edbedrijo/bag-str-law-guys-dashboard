import PageHeader from '@/components/PageHeader'
import { Megaphone } from 'lucide-react'

const TEAM = [
  { name: 'George',         role: 'Setter' },
  { name: 'Jeff',           role: 'Closer' },
  { name: 'Theresa',        role: 'Closer' },
  { name: 'Amy',            role: 'Operations' },
  { name: 'Gina',           role: 'Onboarding' },
  { name: 'Marketing Team', role: 'To be named' },
  { name: 'Tech Team',      role: 'To be named' },
]

export default function WeeklyProgressPage() {
  return (
    <div>
      <PageHeader title="Weekly Progress" />

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3 mb-6">
        <Megaphone className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-teal-700">Update coming soon...</p>
          <p className="text-sm text-blue-600 mt-0.5">
            A project-management view by team member — weekly priorities, progress, and blockers for each
            person. The roster below is set up; status tracking will be added in a future update.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Team</h2>
        <p className="text-sm text-gray-400 mb-4">Weekly progress will be tracked per member</p>
        <div className="grid grid-cols-2 gap-3">
          {TEAM.map((member) => (
            <div key={member.name} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-400">{member.role}</p>
              </div>
              <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2.5 py-0.5">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
