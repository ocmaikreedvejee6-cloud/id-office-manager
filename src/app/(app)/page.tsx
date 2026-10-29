import Link from 'next/link'
import { AlertTriangle, Clock, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)

const CHIP: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-gray-200 text-gray-800',
  voided: 'bg-red-100 text-red-800',
}

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub as string

  const now = new Date()
  const day = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  const hour = Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', hour12: false }))
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const longDate = now.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [me, today, pending, products, recent] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    supabase.from('effective_sales').select('total_centavos').gte('created_at', `${day}T00:00:00+08:00`),
    supabase.from('sales').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabase.from('products').select('id, name, stock_qty, low_stock_threshold').eq('is_active', true),
    supabase.from('sales').select('id, receipt_no, total_centavos, status, approval_status, created_at')
      .order('created_at', { ascending: false }).limit(6),
  ])

  const rows = today.data ?? []
  const revenue = rows.reduce((s, r) => s + r.total_centavos, 0)
  const waiting = pending.count ?? 0
  const low = (products.data ?? [])
    .filter((p) => p.stock_qty <= p.low_stock_threshold)
    .sort((a, b) => a.stock_qty - b.stock_qty)
  const firstName = (me.data?.full_name ?? '').split(' ')[0]

  const stats = [
    { label: 'Transactions today', value: String(rows.length), icon: Receipt, href: '/sales', alert: false },
    { label: 'Waiting for approval', value: String(waiting), icon: Clock, href: '/approvals', alert: waiting > 0 },
    { label: 'Low-stock products', value: String(low.length), icon: AlertTriangle, href: '/inventory', alert: low.length > 0 },
  ]

  return (
    <>
      <section className="grad-red-circuit mb-4 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-red-900/20 md:p-8">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="mt-1 text-sm text-white/75">{longDate}</p>
        </div>
        <Link href="/reports" className="text-right">
          <span className="block text-3xl font-extrabold md:text-4xl">{peso(revenue)}</span>
          <span className="text-sm text-white/75">Approved sales today</span>
        </Link>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors hover:border-green-700 ${
              s.alert ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.alert ? 'bg-amber-100 text-amber-800' : 'bg-green-50 text-green-800'}`}>
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-2xl font-bold text-gray-900">{s.value}</span>
              <span className="text-xs text-gray-600">{s.label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent sales</h2>
            <Link href="/sales" className="text-sm font-medium text-green-800 underline">View all</Link>
          </div>
          {(recent.data ?? []).length === 0 && <p className="text-sm text-gray-600">No sales yet. Record the first one from Record Sale.</p>}
          <ul className="divide-y divide-gray-100">
            {recent.data?.map((s) => {
              const label = s.status === 'voided' ? 'voided' : s.approval_status
              return (
                <li key={s.id}>
                  <Link href={`/sales/${s.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{s.receipt_no}</span>
                      <span className="text-xs text-gray-600">
                        {new Date(s.created_at).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold text-gray-900">{peso(s.total_centavos)}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${CHIP[label]}`}>{label}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Needs restocking</h2>
            <Link href="/inventory" className="text-sm font-medium text-green-800 underline">Inventory</Link>
          </div>
          {low.length === 0 && <p className="text-sm text-gray-600">Every product is above its low-stock level.</p>}
          <ul className="divide-y divide-gray-100">
            {low.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-900">{p.name}</span>
                <span className={`font-semibold ${p.stock_qty === 0 ? 'text-red-700' : 'text-amber-700'}`}>
                  {p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
