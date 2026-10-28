'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkImage, uploadProductImage } from '@/lib/images'

type Option = { id: string; name: string }

const toCentavos = (v: string) => Math.round(Number(v) * 100)
const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900'

export default function ProductForm({ categories, courses }: { categories: Option[]; courses: Option[] }) {
  const router = useRouter()
  const [f, setF] = useState({
    name: '', sku: '', category_id: '', course_id: '',
    price: '', cost: '', threshold: '5', opening: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!f.name.trim()) return setError('Product name is required.')
    if (!(Number(f.price) >= 0) || f.price === '') return setError('Enter a valid selling price.')
    if (f.cost !== '' && !(Number(f.cost) >= 0)) return setError('Cost must be 0 or more.')
    const threshold = Number(f.threshold)
    if (!Number.isInteger(threshold) || threshold < 0) return setError('Low-stock threshold must be a whole number.')
    const opening = f.opening === '' ? 0 : Number(f.opening)
    if (!Number.isInteger(opening) || opening < 0) return setError('Opening stock must be a whole number.')

    setBusy(true)
    const supabase = createClient()
    const { data, error: insertError } = await supabase.from('products').insert({
      name: f.name.trim(),
      sku: f.sku.trim() || null,
      category_id: f.category_id || null,
      course_id: f.course_id || null,
      price_centavos: toCentavos(f.price),
      cost_centavos: f.cost === '' ? null : toCentavos(f.cost),
      low_stock_threshold: threshold,
    }).select('id').single()

    if (insertError || !data) {
      setBusy(false)
      return setError(insertError?.message ?? 'Could not save the product.')
    }

    if (opening > 0) {
      const { error: stockError } = await supabase.rpc('adjust_stock', {
        p_product: data.id, p_type: 'receipt', p_change: opening, p_reason: 'Opening stock',
      })
      if (stockError) {
        setBusy(false)
        return setError(`Product saved, but opening stock failed: ${stockError.message}. Add it from the Inventory page.`)
      }
    }
    if (file) {
      try {
        const url = await uploadProductImage(file, data.id)
        const { error: imgError } = await supabase.from('products').update({ image_url: url }).eq('id', data.id)
        if (imgError) throw new Error(imgError.message)
      } catch (err) {
        setBusy(false)
        return setError(`Product saved, but the picture failed: ${(err as Error).message}. Add it later with Edit.`)
      }
    }
    router.push('/inventory')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
        <label className="block text-sm font-medium text-gray-800">Selling price (₱)
          <input className={input} type="number" min="0" step="0.01" inputMode="decimal"
            value={f.price} onChange={set('price')} required />
        </label>
        <label className="block text-sm font-medium text-gray-800">Cost per unit (₱, optional)
          <input className={input} type="number" min="0" step="0.01" inputMode="decimal"
            value={f.cost} onChange={set('cost')} />
        </label>
        <label className="block text-sm font-medium text-gray-800">Low-stock threshold
          <input className={input} type="number" min="0" step="1" value={f.threshold} onChange={set('threshold')} />
        </label>
        <label className="block text-sm font-medium text-gray-800">Opening stock (optional)
          <input className={input} type="number" min="0" step="1" value={f.opening} onChange={set('opening')} />
        </label>
        <label className="block text-sm font-medium text-gray-800">SKU / barcode (optional)
          <input className={input} value={f.sku} onChange={set('sku')} />
        </label>
      </div>
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
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-green-900 p-3 font-semibold text-white disabled:opacity-60 md:w-auto md:px-8">
        {busy ? 'Saving…' : 'Save product'}
      </button>
    </form>
  )
}
