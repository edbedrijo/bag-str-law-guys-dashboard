'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Scale,
  LayoutDashboard,
  Filter,
  Users,
  CalendarDays,
  MessageSquare,
  Trophy,
  BarChart2,
  Mail,
  Share2,
  FileText,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Overview',               href: '/',                 icon: LayoutDashboard },
  { label: 'Funnel',                 href: '/funnel',           icon: Filter },
  { label: 'By Source',              href: '/by-source',        icon: Users },
  { label: 'Weekly Calls',           href: '/weekly-calls',     icon: CalendarDays },
  { label: 'Sales Calls & Training', href: '/sales-calls',      icon: MessageSquare },
  { label: 'Closed Deals',           href: '/closed-deals',     icon: Trophy },
  { label: 'Weekly Progress',        href: '/weekly-progress',  icon: BarChart2 },
  { label: 'Email Marketing',        href: '/email-marketing',  icon: Mail },
  { label: 'Social Media Marketing', href: '/social-media',     icon: Share2 },
  { label: 'Report Notes',           href: '/report-notes',     icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 min-h-screen flex flex-col" style={{ backgroundColor: '#0f1117' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-teal-500/20 flex items-center justify-center shrink-0">
          <Scale className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">STR Law Guys</p>
          <p className="text-teal-400 text-[10px] font-semibold uppercase tracking-widest leading-tight">
            Sales Dashboard
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-teal-600/30 text-teal-300 font-medium border-l-2 border-teal-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-teal-400' : 'text-gray-500'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-gray-500 text-xs">Setter: <span className="text-gray-400">George</span></p>
        <p className="text-gray-500 text-xs">Closers: <span className="text-gray-400">Jeff · Theresa</span></p>
        <p className="text-gray-600 text-xs mt-1.5">Brickell Ads · 2026</p>
      </div>
    </aside>
  )
}
