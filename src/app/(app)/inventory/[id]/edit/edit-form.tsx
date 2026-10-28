'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkImage, uploadProductImage } from '@/lib/images'

type Option = { id: string; name: string }
type Product = {
  id: string; name: string; sku: string | null; image_url: string | null; category_id: string | null; course_id: string | null
  price_centavos: number; cost_centavos: number | null; low_stock_threshold: number
}
const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 disabled:bg-gray-100'
const toCentavos = (v: string) => Math.round(Number(v) * 100)

export default function EditForm({ product, categories, courses, isAdmin }: {
  product: Product; categories: Option[]; courses: Option[]; isAdmin: boolean
}) {
  const router = useRouter()
  const [f, setF] = useState({
    name: product.name, sku: product.sku ?? '', category_id: product.category_id ?? '',
    course_id: product.course_id ?? '', price: (product.price_centavos / 100).toFixed(2),
    cost: product.cost_centavos === null ? '' : (product.cost_centavos / 100).toFixed(2),
    threshold: String(product.low_stock_threshold),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const threshold = Number(f.threshold)
    if (!f.name.trim()) return setError('Product name is required.')
    if (!Number.isInteger(threshold) || threshold < 0) return setError('Threshold must be a whole number.')
    if (isAdmin && (f.price === '' || !(Number(f.price) >= 0))) return setError('Enter a valid price.')

    const update: Record<string, unknown> = {
      name: f.name.trim(), sku: f.sku.trim() || null,
      category_id: f.category_id || null, course_id: f.course_id || null,
      low_stock_threshold: threshold,
    }
    // Only admins send prices; the database also rejects price changes from anyone else.
    if (isAdmin) {
      update.price_centavos = toCentavos(f.price)
      update.cost_centavos = f.cost === '' ? null : toCentavos(f.cost)
    }
    setBusy(true)
    if (file) {
      try { update.image_url = await uploadProductImage(file, product.id) }
      catch (err) { setBusy(false); return setError(`Picture upload failed: ${(err as Error).message}`) }
    }
    const { error } = await createClient().from('products').update(update).eq('id', product.id)
    setBusy(false)
    if (error) return setError(error.message)
    router.push('/inventory')
    router.refresh()
  }

  async function archive() {
    if (!window.confirm('Archive this product? It disappears from inventory and sales, but past sales keep it.')) return
    setBusy(true)
    const { error } = await createClient().from('products').update({ is_active: false }).eq('id', product.id)
    setBusy(false)
    if (error) return setError(error.message)
    router.push('/inventory')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-800">Product name
        <input className={input} value={f.name} onChange={set('name')} required />
      </label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-gray-800">Product type
          <select className={input} value={f.category_id} onChange={set('category_id')}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-800">Course (optional)
          <select className={input} value={f.course_id} onChange={set('course_id')}>
            <option value="">None</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-800">Selling price (₱){!isAdmin && ' — admin only'}
          <input className={input} type="number" min="0" step="0.01" value={f.price} onChange={set('price')} disabled={!isAdmin} />
        </label>
        <label className="block text-sm font-medium text-gray-800">Cost per unit (₱){!isAdmin && ' — admin only'}
          <input className={input} type="number" min="0" step="0.01" value={f.cost} onChange={set('cost')} disabled={!isAdmin} />
        </label>
        <label className="block text-sm font-medium text-gray-800">Low-stock threshold
          <input className={input} type="number" min="0" step="1" value={f.threshold} onChange={set('threshold')} />
        </label>
        <label className="block text-sm font-medium text-gray-800">SKU / barcode
          <input className={input} value={f.sku} onChange={set('sku')} />
        </label>
      </div>
      {product.image_url && !file && (
        <img src={product.image_url} alt="" className="h-24 w-24 rounded-lg object-cover" />
      )}
      <label className="block text-sm font-medium text-gray-800">Picture (optional)
        <input type="file" accept="image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm text-gray-900"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            const msg = f ? checkImage(f) : null
            setError(msg)
            setFile(msg ? null : f)
          }} />
      </label>
      <p className="text-xs text-gray-600">Stock quantity is changed only with “Adjust stock” on the inventory page. Price changes never alter old receipts.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="rounded-lg bg-green-900 px-8 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={archive} disabled={busy}
          className="rounded-lg border border-red-700 px-6 py-3 text-red-700 disabled:opacity-60">Archive product</button>
      </div>
    </form>
  )
}
