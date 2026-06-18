import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'STR Law Guys Dashboard',
  description: 'Sales & marketing KPI dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex bg-gray-50 text-gray-900">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
