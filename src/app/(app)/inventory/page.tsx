import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StockActions from './stock-actions'

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)
const relName = (rel: unknown) => (rel as { name: string } | null)?.name ?? '—'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('id, name, sku, image_url, price_centavos, stock_qty, low_stock_threshold, categories(name), courses(name)')
    .eq('is_active', true)
    .order('name')
    .limit(200)
  if (q) query = query.ilike('name', `%${q.replace(/[%_,]/g, '')}%`)

  const { data: products, error } = await query

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-green-900">Inventory</h1>
        <Link href="/inventory/new" className="rounded-lg bg-green-900 px-4 py-2 font-semibold text-white">
          + Add product
        </Link>
      </div>

      <form className="mb-4">
        <input name="q" defaultValue={q ?? ''} placeholder="Search products…"
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />
      </form>

      {error && <p role="alert" className="mb-3 text-sm text-red-700">Could not load products: {error.message}</p>}

      {!error && products?.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          {q ? 'No products match your search.' : 'No products yet. Add your first product.'}
        </div>
      )}

      <ul className="space-y-3">
        {products?.map((p) => {
          const low = p.stock_qty <= p.low_stock_threshold
          return (
            <li key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {p.image_url
                    ? <img src={p.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">No photo</div>}
                <div>
                  <p className="font-semibold text-gray-900">{p.name}<Link href={`/inventory/${p.id}/edit`} className="ml-2 text-xs font-normal text-green-900 underline">Edit</Link></p>
                  <p className="text-xs text-gray-600">
                    {relName(p.categories)} · {relName(p.courses)}{p.sku ? ` · ${p.sku}` : ''}
                  </p>
                </div></div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{peso(p.price_centavos)}</p>
                  <p className={`text-sm font-medium ${low ? 'text-red-700' : 'text-emerald-700'}`}>
                    {p.stock_qty} in stock{low ? ' · low' : ''}
                  </p>
                </div>
              </div>
              <StockActions productId={p.id} name={p.name} />
            </li>
          )
        })}
      </ul>
    </>
  )
}
