'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Prod = { id: string; name: string; price_centavos: number; stock_qty: number }
type Line = { product_id: string; name: string; quantity: number; unit_price_centavos: number }

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)
const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900'

export default function EditSaleForm({ saleId, payment, notes, lines, products, methods }: {
  saleId: string; payment: string; notes: string | null; lines: Line[]; products: Prod[]; methods: string[]
}) {
  const router = useRouter()
  const original: Record<string, number> = {}
  const price = new Map<string, number>()
  const name = new Map<string, string>()
  const stock = new Map<string, number>()
  for (const p of products) { price.set(p.id, p.price_centavos); name.set(p.id, p.name); stock.set(p.id, p.stock_qty) }
  // Products already on the sale keep the price they were sold at.
  for (const l of lines) { original[l.product_id] = l.quantity; price.set(l.product_id, l.unit_price_centavos); name.set(l.product_id, l.name) }

  const [cart, setCart] = useState<Record<string, number>>({ ...original })
  const [method, setMethod] = useState(payment)
  const [note, setNote] = useState(notes ?? '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxFor = (id: string) => (original[id] ?? 0) + (stock.get(id) ?? 0)
  const ids = Object.keys(cart)
  const total = ids.reduce((s, id) => s + (price.get(id) ?? 0) * cart[id], 0)
  const changed =
    method !== payment || note.trim() !== (notes ?? '') ||
    ids.length !== Object.keys(original).length ||
    ids.some((id) => cart[id] !== original[id])
  const addable = products.filter((p) => !(p.id in cart) && p.stock_qty > 0)

  function change(id: string, delta: number) {
    setCart((c) => {
      const next = Math.min((c[id] ?? 0) + delta, maxFor(id))
      const copy = { ...c }
      if (next <= 0) delete copy[id]
      else copy[id] = next
      return copy
    })
  }

  async function submit() {
    setError(null)
    if (ids.length === 0) return setError('Keep at least one item. To cancel the whole sale, ask an admin to void it.')
    if (!changed) return setError('Nothing has changed yet.')
    if (!reason.trim()) return setError('Explain why this edit is needed.')
    setBusy(true)
    const { error } = await createClient().rpc('request_sale_edit', {
      p_sale: saleId,
      p_items: ids.map((id) => ({ product_id: id, quantity: cart[id] })),
      p_payment_method: method === payment ? null : method,
      p_notes: note.trim() === (notes ?? '') ? null : note.trim(),
      p_reason: reason.trim(),
    })
    setBusy(false)
    if (error) return setError(error.message)
    router.push(`/sales/${saleId}`)
    router.refresh()
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <ul className="space-y-3">
        {ids.map((id) => (
          <li key={id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-900">{name.get(id)}<br />
              <span className="text-xs text-gray-600">
                {peso(price.get(id) ?? 0)} each{id in original && original[id] !== cart[id] ? ` · was ${original[id]}` : ''}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <button aria-label="Less" onClick={() => change(id, -1)} className="h-10 w-10 rounded-lg border border-gray-300 text-lg text-gray-900">−</button>
              <span className="w-6 text-center text-gray-900">{cart[id]}</span>
              <button aria-label="More" onClick={() => change(id, 1)} disabled={cart[id] >= maxFor(id)}
                className="h-10 w-10 rounded-lg border border-gray-300 text-lg text-gray-900 disabled:opacity-40">+</button>
            </span>
            <span className="w-20 text-right font-medium text-gray-900">{peso((price.get(id) ?? 0) * cart[id])}</span>
          </li>
        ))}
      </ul>

      {addable.length > 0 && (
        <select value="" onChange={(e) => e.target.value && change(e.target.value, 1)} className={field} aria-label="Add a product">
          <option value="">Add another product…</option>
          {addable.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock_qty} in stock)</option>)}
        </select>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <span className="font-semibold text-gray-900">New total</span>
        <span className="text-xl font-bold text-green-900">{peso(total)}</span>
      </div>

      <label className="block text-sm font-medium text-gray-800">Payment method
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={field}>
          {methods.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-800">Notes
        <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </label>
      <label className="block text-sm font-medium text-gray-800">Reason for this edit (required)
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer bought 2, not 3" className={field} />
      </label>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button onClick={submit} disabled={busy} className="rounded-lg bg-green-900 px-6 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? 'Sending…' : 'Send for approval'}
        </button>
        <Link href={`/sales/${saleId}`} className="rounded-lg border border-gray-300 px-6 py-3 text-gray-800">Cancel</Link>
      </div>
    </div>
  )
}
