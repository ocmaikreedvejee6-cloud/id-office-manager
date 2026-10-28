'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; image_url: string | null; price_centavos: number; stock_qty: number }

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)

export default function PosClient({ products, methods }: { products: Product[]; methods: string[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [method, setMethod] = useState(methods[0])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  // One key per cart: a retry after a network failure can never create a second sale.
  const key = useRef(crypto.randomUUID())

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const byId = new Map(products.map((p) => [p.id, p]))
  const lines = Object.entries(cart).map(([id, qty]) => ({ p: byId.get(id)!, qty }))
  const total = lines.reduce((s, l) => s + l.p.price_centavos * l.qty, 0)
  const shown = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))

  function change(id: string, delta: number) {
    setReceipt(null)
    setCart((c) => {
      const next = (c[id] ?? 0) + delta
      const max = byId.get(id)?.stock_qty ?? 0
      const copy = { ...c }
      if (next <= 0) delete copy[id]
      else copy[id] = Math.min(next, max)
      return copy
    })
  }

  async function submit() {
    if (lines.length === 0) return setError('Add at least one product.')
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data: saleId, error: rpcError } = await supabase.rpc('record_sale', {
      p_idempotency_key: key.current,
      p_items: lines.map((l) => ({ product_id: l.p.id, quantity: l.qty })),
      p_payment_method: method,
      p_notes: notes.trim() || null,
    })
    if (rpcError || !saleId) {
      setBusy(false)
      return setError(rpcError?.message ?? 'The sale was not saved. Your cart is kept; try again.')
    }
    // Confirmed by the database before we show success.
    const { data: sale } = await supabase.from('sales').select('receipt_no').eq('id', saleId).single()
    setReceipt(sale?.receipt_no ?? 'saved')
    setCart({})
    setNotes('')
    key.current = crypto.randomUUID()
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
          className="mb-3 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />
        <ul className="space-y-2">
          {shown.map((p) => (
            <li key={p.id}>
              <button onClick={() => change(p.id, 1)} disabled={p.stock_qty === 0}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm disabled:opacity-50">
                <span className="flex items-center gap-3">
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    : <span className="h-12 w-12 rounded-lg bg-gray-100" />}
                  <span>
                    <span className="block font-medium text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-600">{p.stock_qty} in stock</span>
                  </span>
                </span>
                <span className="font-semibold text-green-900">{peso(p.price_centavos)}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="p-4 text-center text-gray-600">No products found.</li>}
        </ul>
      </section>

      <section className="h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-900">Current sale</h2>
        {lines.length === 0 && <p className="text-sm text-gray-600">Tap a product to add it.</p>}
        <ul className="space-y-3">
          {lines.map(({ p, qty }) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-900">{p.name}<br />
                <span className="text-xs text-gray-600">{peso(p.price_centavos)} each</span></span>
              <span className="flex items-center gap-2">
                <button aria-label="Less" onClick={() => change(p.id, -1)} className="h-10 w-10 rounded-lg border border-gray-300 text-lg text-gray-900">−</button>
                <span className="w-6 text-center text-gray-900">{qty}</span>
                <button aria-label="More" onClick={() => change(p.id, 1)} disabled={qty >= p.stock_qty} className="h-10 w-10 rounded-lg border border-gray-300 text-lg text-gray-900 disabled:opacity-40">+</button>
              </span>
              <span className="w-20 text-right font-medium text-gray-900">{peso(p.price_centavos * qty)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-green-900">{peso(total)}</span>
        </div>

        <label className="mt-4 block text-sm font-medium text-gray-800">Payment method
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900">
            {methods.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)"
          className="mt-3 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />

        {!online && <p role="alert" className="mt-3 text-sm text-red-700">You are offline. Sales cannot be recorded until the connection returns.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {receipt && (
          <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-900">
            Submitted as <b>{receipt}</b>. It is waiting for supervisor approval; stock is deducted once approved.
          </p>
        )}

        <button onClick={submit} disabled={busy || !online || lines.length === 0}
          className="mt-4 w-full rounded-lg bg-green-900 p-4 text-lg font-semibold text-white disabled:opacity-50">
          {busy ? 'Submitting…' : 'Submit for approval'}
        </button>
      </section>
    </div>
  )
}
