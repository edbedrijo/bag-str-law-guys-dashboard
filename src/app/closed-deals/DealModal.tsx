'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Pencil } from 'lucide-react'

interface DealFields {
  clientName: string
  email:      string
  phone:      string
  matterType: string
  intakeDate: string
  amount:     string
  referredBy: string
  leadSource: string
}

const EMPTY: DealFields = {
  clientName: '', email: '', phone: '', matterType: '',
  intakeDate: '', amount: '', referredBy: '', leadSource: '',
}

interface EditProps {
  rowIndex: number
  deal: DealFields
}

export function EditDealButton({ rowIndex, deal }: EditProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title="Edit deal"
      >
        <Pencil size={14} />
      </button>
      {open && (
        <DealModal
          mode="edit"
          rowIndex={rowIndex}
          initial={deal}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export function AddDealButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-3 rounded-full shadow-lg transition-colors"
      >
        <Plus size={18} />
        Add Deal
      </button>
      {open && (
        <DealModal mode="add" onClose={() => setOpen(false)} />
      )}
    </>
  )
}

interface ModalProps {
  mode:      'add' | 'edit'
  rowIndex?: number
  initial?:  DealFields
  onClose:   () => void
}

function DealModal({ mode, rowIndex, initial, onClose }: ModalProps) {
  const router  = useRouter()
  const [form, setForm]       = useState<DealFields>(initial ?? EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // Prevent background scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function set(field: keyof DealFields, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body    = mode === 'edit' ? { ...form, rowIndex } : form
      const method  = mode === 'edit' ? 'PUT' : 'POST'
      const res     = await fetch('/api/closed-deals', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to save')
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{mode === 'add' ? 'Add Deal' : 'Edit Deal'}</h2>
            <p className="text-sm text-gray-400">{mode === 'add' ? 'New closed deal' : 'Update deal details'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client Name" value={form.clientName} onChange={(v) => set('clientName', v)} required colSpan />
            <Field label="Email"       value={form.email}      onChange={(v) => set('email', v)} type="email" />
            <Field label="Phone"       value={form.phone}      onChange={(v) => set('phone', v)} onBlur={() => set('phone', formatPhone(form.phone))} type="tel" />
            <Field label="Matter Type" value={form.matterType} onChange={(v) => set('matterType', v)} />
            <DateField label="Intake Date" value={form.intakeDate} onChange={(v) => set('intakeDate', v)} />
            <Field label="Amount"      value={form.amount}     onChange={(v) => set('amount', v)} placeholder="$0.00" />
            <Field label="Referred By" value={form.referredBy} onChange={(v) => set('referredBy', v)} />
            <Field label="Lead Source" value={form.leadSource} onChange={(v) => set('leadSource', v)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-sm font-medium text-white transition-colors"
            >
              {saving ? 'Saving…' : mode === 'add' ? 'Add Deal' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface FieldProps {
  label:        string
  value:        string
  onChange:     (v: string) => void
  onBlur?:      () => void
  type?:        string
  placeholder?: string
  required?:    boolean
  colSpan?:     boolean
}

function Field({ label, value, onChange, onBlur, type = 'text', placeholder, required, colSpan }: FieldProps) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="block text-left text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-300 transition"
      />
    </div>
  )
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  return raw
}

// MM/DD/YYYY  →  YYYY-MM-DD  (for <input type="date">)
function toInputDate(mmddyyyy: string): string {
  const parts = mmddyyyy.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return ''
  return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`
}

// YYYY-MM-DD  →  MM/DD/YYYY  (for storing in sheet)
function fromInputDate(yyyymmdd: string): string {
  const parts = yyyymmdd.split('-')
  if (parts.length !== 3) return ''
  return `${parts[1]}/${parts[2]}/${parts[0]}`
}

interface DateFieldProps { label: string; value: string; onChange: (v: string) => void }

function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <div>
      <label className="block text-left text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="date"
        value={toInputDate(value)}
        onChange={(e) => onChange(e.target.value ? fromInputDate(e.target.value) : '')}
        required
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
      />
    </div>
  )
}
