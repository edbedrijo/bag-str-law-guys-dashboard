'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Pencil, Trash2 } from 'lucide-react'

interface DealFields {
  clientName:    string
  email:         string
  phone:         string
  matterType:    string
  intakeDate:    string
  amount:        string
  cashCollected: string
  referredBy:    string
  leadSource:    string
}

export interface DealOptions {
  matterTypes: string[]
  referredBys: string[]
  leadSources: string[]
}

const EMPTY: DealFields = {
  clientName: '', email: '', phone: '', matterType: '',
  intakeDate: '', amount: '', cashCollected: '', referredBy: '', leadSource: '',
}

// Format digits into (xxx) xxx-xxxx as user types
function formatPhoneLive(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3)  return digits.length ? `(${digits}` : ''
  if (digits.length <= 6)  return `(${digits.slice(0,3)}) ${digits.slice(3)}`
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
}

// ── Buttons ───────────────────────────────────────────────────────────────────

interface EditProps {
  rowIndex: number
  deal:     DealFields
  options:  DealOptions
}

export function EditDealButton({ rowIndex, deal, options }: EditProps) {
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
          options={options}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

interface AddProps { options: DealOptions }

export function AddDealButton({ options }: AddProps) {
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
        <DealModal mode="add" options={options} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  mode:      'add' | 'edit'
  rowIndex?: number
  initial?:  DealFields
  options:   DealOptions
  onClose:   () => void
}

export function DealModal({ mode, rowIndex, initial, options, onClose }: ModalProps) {
  const router = useRouter()
  const [form,      setForm]      = useState<DealFields>(initial ?? EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function set(field: keyof DealFields, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePhoneChange(raw: string) {
    // Allow only digits and formatting chars; reformat live
    set('phone', formatPhoneLive(raw))
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/closed-deals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      router.refresh()
      onClose()
    } catch {
      setError('Delete failed. Please try again.')
      setConfirmDel(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body   = mode === 'edit' ? { ...form, rowIndex } : form
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res    = await fetch('/api/closed-deals', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900">{mode === 'add' ? 'Add Deal' : 'Edit Deal'}</h2>
            <p className="text-sm text-gray-400">{mode === 'add' ? 'New closed deal' : 'Update deal details'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Row 1: Client Name full width */}
            <Field label="Client Name" value={form.clientName} onChange={(v) => set('clientName', v)} required colSpan />
            {/* Row 2: Email + Phone */}
            <Field label="Email" value={form.email} onChange={(v) => set('email', v)} type="email" />
            <div>
              <label className="block text-left text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-300 transition"
              />
            </div>
            {/* Row 3: Matter Type + Intake Date */}
            <SelectField label="Matter Type" value={form.matterType} onChange={(v) => set('matterType', v)} options={options.matterTypes} />
            <DateField label="Intake Date" value={form.intakeDate} onChange={(v) => set('intakeDate', v)} />
            {/* Row 4: Amount + Cash Collected */}
            <MoneyField label="Amount"         value={form.amount}        onChange={(v) => set('amount', v)} />
            <MoneyField label="Cash Collected" value={form.cashCollected} onChange={(v) => set('cashCollected', v)} />
            {/* Row 5: Referred By + Lead Source */}
            <SelectField label="Referred By" value={form.referredBy} onChange={(v) => set('referredBy', v)} options={options.referredBys} />
            <SelectField label="Lead Source" value={form.leadSource} onChange={(v) => set('leadSource', v)} options={options.leadSources} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Delete confirm banner — edit mode only */}
          {mode === 'edit' && confirmDel && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 font-medium">Delete this deal permanently?</p>
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
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
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

// ── Field components ──────────────────────────────────────────────────────────

interface FieldProps {
  label:        string
  value:        string
  onChange:     (v: string) => void
  type?:        string
  placeholder?: string
  required?:    boolean
  colSpan?:     boolean
}

function Field({ label, value, onChange, type = 'text', placeholder, required, colSpan }: FieldProps) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="block text-left text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-300 transition"
      />
    </div>
  )
}

// Formats integer part with commas, preserves decimal as user types
function formatMoneyLive(raw: string): string {
  // Strip everything except digits and the first decimal point
  const cleaned = raw.replace(/[^\d.]/g, '')
  const dotIndex = cleaned.indexOf('.')
  const intPart  = dotIndex >= 0 ? cleaned.slice(0, dotIndex) : cleaned
  const decPart  = dotIndex >= 0 ? cleaned.slice(dotIndex)    : ''   // includes the dot
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return formatted + decPart
}

// On blur: ensure exactly .00 if no decimal was typed; pad to 2 places if partial
function finalizeMoneyOnBlur(val: string): string {
  if (!val) return ''
  const cleaned = val.replace(/[^\d.]/g, '')
  if (!cleaned || cleaned === '.') return ''
  const num = parseFloat(cleaned)
  if (isNaN(num)) return ''
  // Use toFixed(2) then re-add commas
  const [intPart, decPart] = num.toFixed(2).split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${formatted}.${decPart}`
}

interface MoneyFieldProps { label: string; value: string; onChange: (v: string) => void }

function MoneyField({ label, value, onChange }: MoneyFieldProps) {
  return (
    <div>
      <label className="block text-left text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(formatMoneyLive(e.target.value))}
        onBlur={(e) => onChange(finalizeMoneyOnBlur(e.target.value))}
        placeholder="0.00"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-300 transition"
      />
    </div>
  )
}

// Per-field localStorage keys for custom "Other" entries
const LS_CUSTOM: Record<string, string> = {
  'Matter Type': 'dealCustom_matterType',
  'Referred By': 'dealCustom_referredBy',
  'Lead Source':  'dealCustom_leadSource',
}

function loadCustom(label: string): string[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM[label] ?? '')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCustom(label: string, value: string) {
  const key = LS_CUSTOM[label]
  if (!key) return
  const existing = loadCustom(label)
  if (!existing.includes(value)) {
    localStorage.setItem(key, JSON.stringify([...existing, value]))
  }
}

interface SelectFieldProps {
  label:    string
  value:    string
  onChange: (v: string) => void
  options:  string[]
}

const OTHER = '__other__'

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const [custom, setCustom] = useState<string[]>(() => loadCustom(label))
  const [showInput, setShowInput] = useState(false)
  const [inputVal,  setInputVal]  = useState('')

  // All options = server options + saved custom entries, deduplicated
  const allOptions = [...new Set([...options, ...custom])].sort()

  // If current value isn't in the list (legacy data), treat as custom
  const isUnknown = value && !allOptions.includes(value)

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === OTHER) {
      setShowInput(true)
      setInputVal('')
    } else {
      setShowInput(false)
      onChange(e.target.value)
    }
  }

  function handleCustomConfirm() {
    const trimmed = inputVal.trim()
    if (!trimmed) return
    saveCustom(label, trimmed)
    setCustom((prev) => [...new Set([...prev, trimmed])])
    onChange(trimmed)
    setShowInput(false)
    setInputVal('')
  }

  const selectValue = showInput ? OTHER : (isUnknown ? OTHER : value)

  return (
    <div>
      <label className="block text-left text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={selectValue}
        onChange={handleSelect}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white transition"
      >
        <option value="">— select —</option>
        {isUnknown && <option value={OTHER}>{value}</option>}
        {allOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value={OTHER} style={{ color: '#0d9488', fontWeight: 600 }}>+ Add New</option>
      </select>

      {showInput && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomConfirm() } }}
            placeholder={`New ${label.toLowerCase()}…`}
            className="flex-1 px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-300 transition"
          />
          <button
            type="button"
            onClick={handleCustomConfirm}
            className="px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// MM/DD/YYYY → YYYY-MM-DD (for <input type="date">)
function toInputDate(mmddyyyy: string): string {
  const parts = mmddyyyy.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return ''
  return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`
}

// YYYY-MM-DD → MM/DD/YYYY (for storing in sheet)
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
