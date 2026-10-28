import { createClient } from '@/lib/supabase/server'

const peso = (centavos: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(centavos / 100)

export default async function Dashboard() {
  const supabase = await createClient()

  // Start of today in Asia/Manila
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  const start = `${day}T00:00:00+08:00`

  const [today, pending, lowStock] = await Promise.all([
    supabase.from('effective_sales').select('total_centavos').gte('created_at', start),
    supabase.from('sales').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabase.from('products').select('id, stock_qty, low_stock_threshold').eq('is_active', true),
  ])

  const rows = today.data ?? []
  const revenue = rows.reduce((sum, r) => sum + r.total_centavos, 0)
  const low = (lowStock.data ?? []).filter((p) => p.stock_qty <= p.low_stock_threshold).length

  const cards = [
    { label: 'Approved sales today', value: peso(revenue) },
    { label: 'Transactions today', value: String(rows.length) },
    { label: 'Waiting for approval', value: String(pending.count ?? 0) },
    { label: 'Low-stock products', value: String(low) },
  ]

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-600">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>
    </>
  )
}
