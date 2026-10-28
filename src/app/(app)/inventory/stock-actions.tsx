'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const OPTIONS = [
  { key: 'receipt', label: 'Receive stock (+)', sign: 1 },
  { key: 'returned', label: 'Returned item (+)', sign: 1 },
  { key: 'damaged', label: 'Damaged (−)', sign: -1 },
  { key: 'lost', label: 'Lost (−)', sign: -1 },
  { key: 'correction+', label: 'Correction: add (+)', sign: 1 },
  { key: 'correction-', label: 'Correction: remove (−)', sign: -1 },
]

export default function StockActions({ productId, name }: { productId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('receipt')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(qty)
    if (!Number.isInteger(n) || n <= 0) return setError('Enter a whole number greater than 0.')
    if (!reason.trim()) return setError('A reason is required.')

    const opt = OPTIONS.find((o) => o.key === kind)!
    setBusy(true)
    setError(null)
    const { error } = await createClient().rpc('adjust_stock', {
      p_product: productId,
      p_type: kind.replace(/[+-]$/, ''),
      p_change: opt.sign * n,
      p_reason: reason.trim(),
      p_date: date,
    })
    setBusy(false)
    if (error) return setError(error.message)

    setOpen(false)
    setQty('')
    setReason('')
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="mt-3 rounded-lg border border-green-900 px-3 py-2 text-sm font-medium text-green-900">
        Adjust stock
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
      <p className="text-sm font-semibold text-gray-900">Adjust stock: {name}</p>
      <select value={kind} onChange={(e) => setKind(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900">
        {OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="1" step="1" inputMode="numeric" placeholder="Quantity" value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />
      </div>
      <input placeholder="Reason (e.g. delivery from supplier)" value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-lg bg-green-900 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800">
          Cancel
        </button>
      </div>
    </form>
  )
}
