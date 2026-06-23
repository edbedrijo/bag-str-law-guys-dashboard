'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, ExternalLink } from 'lucide-react'
import type { AppointmentRow } from '@/types/appointments'

export interface ApptFields {
  firstName:       string
  lastName:        string
  email:           string
  phone:           string
  dateIn:          string
  callDate:        string
  callStatus:      string
  callOutcome:     string
  cashCollected:   string
  totalPrice:      string
  notesCash:       string
  setter:          string
  closer:          string
  leadQuality:     string
  callQuality:     string
  setterRecording: string
  salesRecording:  string
  notes:           string
  calendar:        string
}

export interface ApptOptions {
  setters:   string[]
  closers:   string[]
  calendars: string[]
}

const CALL_STATUSES  = ['Call Booked', 'Showed', 'No Show', 'Rescheduled', 'Cancelled']
const CALL_OUTCOMES  = ['WON', 'Follow Up Scheduled', 'Deposit Made', 'PIF', 'Not Sold', 'Not Qualified', 'Need To Follow Up']
const LEAD_QUALITIES = ['Bad Lead', 'Low Quality', 'So-So', 'Qualified', 'High Value']
const CALL_QUALITIES = ['Bad Call', 'Weak Call', 'Average Call', 'Good Call', 'Excellent Call']

const EMPTY: ApptFields = {
  firstName: '', lastName: '', email: '', phone: '',
  dateIn: '', callDate: '', callStatus: '', callOutcome: '',
  cashCollected: '', totalPrice: '', notesCash: '',
  setter: '', closer: '', leadQuality: '', callQuality: '',
  setterRecording: '', salesRecording: '', notes: '', calendar: '',
}

export function rowToFields(r: AppointmentRow): ApptFields {
  return {
    firstName: r.firstName, lastName: r.lastName, email: r.email, phone: r.phone,
    dateIn: r.dateIn, callDate: r.callDate, callStatus: r.callStatus, callOutcome: r.callOutcome,
    cashCollected: r.cashCollected, totalPrice: r.totalPrice, notesCash: r.notesCash,
    setter: r.setter, closer: r.closer, leadQuality: r.leadQuality, callQuality: r.callQuality,
    setterRecording: r.setterRecording, salesRecording: r.salesRecording,
    notes: r.notes, calendar: r.calendar,
  }
}

// ── Format helpers ────────────────────────────────────────────────────────────

function formatPhoneLive(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
}

function formatMoneyLive(raw: string): string {
  const cleaned  = raw.replace(/[^\d.]/g, '')
  const dotIndex = cleaned.indexOf('.')
  const intPart  = dotIndex >= 0 ? cleaned.slice(0, dotIndex) : cleaned
  const decPart  = dotIndex >= 0 ? cleaned.slice(dotIndex) : ''
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decPart
}

function finalizeMoneyOnBlur(val: string): string {
  if (!val) return ''
  const cleaned = val.replace(/[^\d.]/g, '')
  if (!cleaned || cleaned === '.') return ''
  const num = parseFloat(cleaned)
  if (isNaN(num)) return ''
  const [i, d] = num.toFixed(2).split('.')
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`
}

// Date In: stored as "M/D/YYYY" or "MM/DD/YYYY"
function toInputDate(val: string): string {
  if (!val) return ''
  const parts = val.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return ''
  return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`
}
function fromInputDate(val: string): string {
  if (!val) return ''
  const [y, m, d] = val.split('-')
  if (!y || !m || !d) return ''
  return `${m}/${d}/${y}`
}

// Call Date: stored as "MM/DD/YYYY HH:MM am" (12hr)
function toInputDatetime(val: string): string {
  if (!val) return ''
  const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (!match) return ''
  const [, m, d, y, hStr, min, ampm] = match
  let hour = parseInt(hStr)
  if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12
  if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${String(hour).padStart(2,'0')}:${min}`
}
function fromInputDatetime(val: string): string {
  if (!val) return ''
  const [datePart, timePart] = val.split('T')
  if (!datePart || !timePart) return ''
  const [y, m, d] = datePart.split('-')
  const [hStr, min] = timePart.split(':')
  let hour = parseInt(hStr)
  const ampm = hour >= 12 ? 'pm' : 'am'
  if (hour > 12) hour -= 12
  if (hour === 0) hour = 12
  return `${m}/${d}/${y} ${String(hour).padStart(2,'0')}:${min} ${ampm}`
}

// ── Add button (floating) ─────────────────────────────────────────────────────

export function AddApptButton({ options }: { options: ApptOptions }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-full shadow-sm transition-colors shrink-0"
      >
        <Plus size={18} />
        Add Appointment
      </button>
      {open && <ApptModal mode="add" options={options} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Modal (exported so table can render it directly) ──────────────────────────

interface ModalProps {
  mode:        'add' | 'edit'
  rowIndex?:   number
  initial?:    ApptFields
  options:     ApptOptions
  onClose:     () => void
}

export function ApptModal({ mode, rowIndex, initial, options, onClose }: ModalProps) {
  const router = useRouter()
  const [form,       setForm]       = useState<ApptFields>(initial ?? EMPTY)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function set(field: keyof ApptFields, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      const res = await fetch('/api/appointments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex }),
      })
      if (!res.ok) throw new Error()
      router.refresh(); onClose()
    } catch {
      setError('Delete failed. Please try again.')
      setConfirmDel(false)
    } finally { setDeleting(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const body   = mode === 'edit' ? { ...form, rowIndex } : form
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res    = await fetch('/api/appointments', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      router.refresh(); onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {mode === 'add' ? 'Add Appointment' : 'Edit Appointment'}
            </h2>
            <p className="text-sm text-gray-400">
              {mode === 'add' ? 'New appointment record' : 'Update appointment details'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={form.firstName} onChange={(v) => set('firstName', v)} required />
            <Field label="Last Name"  value={form.lastName}  onChange={(v) => set('lastName',  v)} />
            <Field label="Email" value={form.email} onChange={(v) => set('email', v)} type="email" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input
                type="tel" inputMode="numeric" value={form.phone}
                onChange={(e) => set('phone', formatPhoneLive(e.target.value))}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 placeholder-gray-300 transition"
              />
            </div>

            {/* Date In — date picker */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date In</label>
              <input
                type="date"
                value={toInputDate(form.dateIn)}
                onChange={(e) => set('dateIn', e.target.value ? fromInputDate(e.target.value) : '')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition"
              />
            </div>

            {/* Call Date — datetime picker */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Call Date</label>
              <input
                type="datetime-local"
                value={toInputDatetime(form.callDate)}
                onChange={(e) => set('callDate', e.target.value ? fromInputDatetime(e.target.value) : '')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition"
              />
            </div>

            <FixedSelect label="Call Status"  value={form.callStatus}  onChange={(v) => set('callStatus',  v)} options={CALL_STATUSES} />
            <FixedSelect label="Call Outcome" value={form.callOutcome} onChange={(v) => set('callOutcome', v)} options={CALL_OUTCOMES} />
            <DynSelect   label="Closer"       value={form.closer}      onChange={(v) => set('closer',      v)} options={options.closers} />
            <DynSelect   label="Setter"       value={form.setter}      onChange={(v) => set('setter',      v)} options={options.setters} />
            <MoneyField  label="Cash Collected" value={form.cashCollected} onChange={(v) => set('cashCollected', v)} />
            <MoneyField  label="Total Price"    value={form.totalPrice}    onChange={(v) => set('totalPrice',    v)} />
            <FixedSelect label="Lead Quality" value={form.leadQuality} onChange={(v) => set('leadQuality', v)} options={LEAD_QUALITIES} />
            <FixedSelect label="Call Quality" value={form.callQuality} onChange={(v) => set('callQuality', v)} options={CALL_QUALITIES} />
            <Field       label="Notes (Cash)" value={form.notesCash}  onChange={(v) => set('notesCash',  v)} colSpan />
            <DynSelect   label="Calendar"     value={form.calendar}   onChange={(v) => set('calendar',   v)} options={options.calendars} colSpan />
            <UrlField    label="Setter Call Recording URL" value={form.setterRecording} onChange={(v) => set('setterRecording', v)} />
            <UrlField    label="Sales Call Recording URL"  value={form.salesRecording}  onChange={(v) => set('salesRecording',  v)} />
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 placeholder-gray-300 transition resize-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {mode === 'edit' && confirmDel && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 font-medium">Delete this appointment permanently?</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setConfirmDel(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors">Cancel</button>
                <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium transition-colors">
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {mode === 'edit' && !confirmDel && (
              <button type="button" onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-sm font-medium text-white transition-colors">
              {saving ? 'Saving…' : mode === 'add' ? 'Add Appointment' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Field components ──────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder, required, colSpan }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean; colSpan?: boolean
}) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 placeholder-gray-300 transition"
      />
    </div>
  )
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="text" inputMode="decimal" value={value}
        onChange={(e) => onChange(formatMoneyLive(e.target.value))}
        onBlur={(e)  => onChange(finalizeMoneyOnBlur(e.target.value))}
        placeholder="0.00"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 placeholder-gray-300 transition"
      />
    </div>
  )
}

// URL field — shows an "Open" link button when a URL is present
function UrlField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="col-span-2">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="url" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 placeholder-gray-300 transition"
        />
        {value && (
          <a href={value} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-teal-600 hover:text-teal-800 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap">
            <ExternalLink size={14} /> Open
          </a>
        )}
      </div>
    </div>
  )
}

function FixedSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 bg-white transition">
        <option value="">— select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

const LS_CUSTOM: Record<string, string> = {
  Closer:   'apptCustom_closer',
  Setter:   'apptCustom_setter',
  Calendar: 'apptCustom_calendar',
}

function loadCustom(label: string): string[] {
  try { return JSON.parse(localStorage.getItem(LS_CUSTOM[label] ?? '') ?? '[]') } catch { return [] }
}
function saveCustom(label: string, value: string) {
  const key = LS_CUSTOM[label]; if (!key) return
  const existing = loadCustom(label)
  if (!existing.includes(value)) localStorage.setItem(key, JSON.stringify([...existing, value]))
}

const OTHER = '__other__'

function DynSelect({ label, value, onChange, options, colSpan }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; colSpan?: boolean
}) {
  const [custom,    setCustom]    = useState<string[]>(() => loadCustom(label))
  const [showInput, setShowInput] = useState(false)
  const [inputVal,  setInputVal]  = useState('')

  const allOptions = [...new Set([...options, ...custom])].sort()
  const isUnknown  = !!(value && !allOptions.includes(value))

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === OTHER) { setShowInput(true); setInputVal('') }
    else { setShowInput(false); onChange(e.target.value) }
  }

  function confirm() {
    const trimmed = inputVal.trim(); if (!trimmed) return
    saveCustom(label, trimmed)
    setCustom((prev) => [...new Set([...prev, trimmed])])
    onChange(trimmed); setShowInput(false); setInputVal('')
  }

  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={showInput ? OTHER : (isUnknown ? OTHER : value)}
        onChange={handleSelect}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 bg-white transition">
        <option value="">— select —</option>
        {isUnknown && <option value={OTHER}>{value}</option>}
        {allOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={OTHER} style={{ color: '#0d9488', fontWeight: 600 }}>+ Add New</option>
      </select>
      {showInput && (
        <div className="flex gap-2 mt-2">
          <input autoFocus type="text" value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirm() } }}
            placeholder={`New ${label.toLowerCase()}…`}
            className="flex-1 px-3 py-2 text-sm border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300 transition"
          />
          <button type="button" onClick={confirm}
            className="px-3 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition">
            Add
          </button>
        </div>
      )}
    </div>
  )
}
