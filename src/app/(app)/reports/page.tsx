import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchLines, resolveRange, type Line } from '@/lib/reports'

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)

function group(lines: Line[], key: (l: Line) => string) {
  const m = new Map<string, { amount: number; qty: number }>()
  for (const l of lines) {
    const g = m.get(key(l)) ?? { amount: 0, qty: 0 }
    g.amount += l.subtotal
    g.qty += l.qty
    m.set(key(l), g)
  }
  return [...m.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.amount - a.amount)
}

function Bars({ title, rows }: { title: string; rows: { label: string; amount: number; qty: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.amount))
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 && <p className="text-sm text-gray-600">No sales in this period.</p>}
      <ul className="space-y-3">
        {rows.slice(0, 10).map((r) => (
          <li key={r.label}>
            <div className="flex justify-between text-sm text-gray-900">
              <span>{r.label}</span><span>{peso(r.amount)} · {r.qty} pcs</span>
            </div>
            <div className="mt-1 h-2 rounded bg-gray-100">
              <div className="h-2 rounded bg-green-800" style={{ width: `${(r.amount / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function ReportsPage({
  searchParams,
}: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams
  const { from, to, range } = resolveRange(sp)
  const supabase = await createClient()

  let lines: Line[] = []
  let loadError: string | null = null
  try { lines = await fetchLines(supabase, from, to) } catch (e) { loadError = (e as Error).message }

  const [voided, products] = await Promise.all([
    supabase.from('sales').select('total_centavos')
      .eq('status', 'voided').gte('created_at', `${from}T00:00:00+08:00`).lte('created_at', `${to}T23:59:59.999+08:00`),
    supabase.from('products').select('id, name, stock_qty, low_stock_threshold, cost_centavos').eq('is_active', true),
  ])

  const revenue = lines.reduce((s, l) => s + l.subtotal, 0)
  const units = lines.reduce((s, l) => s + l.qty, 0)
  const receipts = new Set(lines.map((l) => l.receipt)).size
  const costed = lines.filter((l) => l.cost !== null)
  const profit = costed.reduce((s, l) => s + (l.price - l.cost!) * l.qty, 0)

  const byProduct = group(lines, (l) => l.product)
  const soldIds = new Set(lines.map((l) => l.productId))
  const stock = products.data ?? []
  const valued = stock.filter((p) => p.cost_centavos !== null)
  const valuation = valued.reduce((s, p) => s + p.stock_qty * p.cost_centavos!, 0)
  const outOfStock = stock.filter((p) => p.stock_qty === 0)
  const lowStock = stock.filter((p) => p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold)
  const slow = stock.filter((p) => !soldIds.has(p.id) && p.stock_qty > 0).sort((a, b) => b.stock_qty - a.stock_qty).slice(0, 10)

  const presets = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['month', 'This month']]
  const input = 'rounded-lg border border-gray-300 bg-white p-3 text-gray-900'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-green-900">Reports</h1>
        <a href={`/reports/export?from=${from}&to=${to}`}
          className="rounded-lg bg-green-900 px-4 py-2 font-semibold text-white">Download CSV</a>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {presets.map(([k, label]) => (
          <Link key={k} href={`/reports?range=${k}`}
            className={`rounded-lg border px-3 py-2 text-sm ${range === k ? 'border-green-900 bg-green-900 text-white' : 'border-gray-300 bg-white text-gray-800'}`}>
            {label}
          </Link>
        ))}
      </div>
      <form className="mb-1 flex flex-wrap items-center gap-2">
        <input type="hidden" name="range" value="custom" />
        <input type="date" name="from" defaultValue={from} aria-label="From" className={input} />
        <input type="date" name="to" defaultValue={to} aria-label="To" className={input} />
        <button className="rounded-lg border border-green-900 px-4 py-3 text-sm font-medium text-green-900">Apply</button>
      </form>
      <p className="mb-4 text-xs text-gray-600">
        Showing {from} to {to} (Asia/Manila). Only approved, un-voided sales are counted.
      </p>

      {loadError && <p role="alert" className="mb-3 text-sm text-red-700">{loadError}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Revenue (gross)', peso(revenue)],
          ['Units sold', String(units)],
          ['Transactions', String(receipts)],
          ['Profit', costed.length ? peso(profit) : 'No cost data'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-600">{label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
      {costed.length > 0 && costed.length < lines.length && (
        <p className="mb-4 text-xs text-amber-800">Profit covers {costed.length} of {lines.length} sold lines; the rest have no recorded cost.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Bars title="Revenue by product" rows={byProduct} />
        <Bars title="Revenue by course" rows={group(lines, (l) => l.course)} />
        <Bars title="Revenue by product type" rows={group(lines, (l) => l.type)} />
        <Bars title="Revenue by staff member" rows={group(lines, (l) => l.staff)} />
        <Bars title="Payment methods" rows={group(lines, (l) => l.payment)} />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Stock and voids</h2>
          <ul className="space-y-1 text-sm text-gray-900">
            <li>Stock value at cost: <b>{valued.length ? peso(valuation) : 'No cost data'}</b>
              {valued.length > 0 && valued.length < stock.length && ` (${valued.length} of ${stock.length} products)`}</li>
            <li>Out of stock: <b>{outOfStock.length}</b>{outOfStock.length > 0 && ` — ${outOfStock.map((p) => p.name).join(', ')}`}</li>
            <li>Low stock: <b>{lowStock.length}</b>{lowStock.length > 0 && ` — ${lowStock.map((p) => `${p.name} (${p.stock_qty})`).join(', ')}`}</li>
            <li>Voided sales in period: <b>{voided.data?.length ?? 0}</b> ({peso((voided.data ?? []).reduce((s, v) => s + v.total_centavos, 0))})</li>
          </ul>
          <h3 className="mb-1 mt-4 text-sm font-semibold text-gray-900">Slow-moving (in stock, no sales this period)</h3>
          {slow.length === 0
            ? <p className="text-sm text-gray-600">None.</p>
            : <ul className="text-sm text-gray-900">{slow.map((p) => <li key={p.id}>{p.name} — {p.stock_qty} in stock</li>)}</ul>}
        </section>
      </div>
    </>
  )
}
