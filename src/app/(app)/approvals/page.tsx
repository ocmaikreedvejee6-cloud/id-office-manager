import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ApprovalButtons from './approval-buttons'
import EditRequestButtons from './edit-request-buttons'

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)
const manila = (d: string) => new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
const person = (r: unknown) => (r as { full_name: string } | null)?.full_name ?? 'Unknown'

type Item = { quantity: number; unit_price_centavos: number; revision: number; products: { name: string } | null }
type LiveItem = { product_id: string; quantity: number; unit_price_centavos: number; revision: number; products: { name: string } | null }
type EditSale = {
  receipt_no: string; payment_method: string; notes: string | null; total_centavos: number
  current_revision: number; sale_items: LiveItem[]
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [salesRes, editsRes] = await Promise.all([
    supabase.from('sales')
      .select(`id, receipt_no, total_centavos, payment_method, notes, created_at, staff_id, current_revision,
               profiles!staff_id(full_name),
               sale_items(quantity, unit_price_centavos, revision, products(name))`)
      .eq('approval_status', 'pending').order('created_at'),
    supabase.from('sale_change_requests')
      .select(`id, sale_id, requested_by, proposed_items, proposed_payment_method, proposed_notes, reason, created_at,
               requester:profiles!requested_by(full_name),
               sale:sales!sale_id(receipt_no, payment_method, notes, total_centavos, current_revision,
                 sale_items(product_id, quantity, unit_price_centavos, revision, products(name)))`)
      .eq('status', 'pending').order('created_at'),
  ])
  const sales = salesRes.data ?? []
  const edits = editsRes.data ?? []

  // Names and current prices for products that appear in proposed edits
  const wanted = new Set<string>()
  for (const e of edits) for (const i of e.proposed_items as { product_id: string }[]) wanted.add(i.product_id)
  const prodRes = wanted.size
    ? await supabase.from('products').select('id, name, price_centavos').in('id', [...wanted])
    : { data: [] as { id: string; name: string; price_centavos: number }[] }
  const prod = new Map((prodRes.data ?? []).map((p) => [p.id, p]))

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Approvals</h1>
      {(salesRes.error || editsRes.error) && (
        <p role="alert" className="mb-3 text-sm text-red-700">{salesRes.error?.message ?? editsRes.error?.message}</p>
      )}
      {sales.length === 0 && edits.length === 0 && !salesRes.error && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          Nothing is waiting for approval.
        </div>
      )}

      {sales.length > 0 && <h2 className="mb-2 font-semibold text-gray-900">New sales</h2>}
      <ul className="space-y-3">
        {sales.map((s) => {
          const items = (s.sale_items as unknown as Item[]).filter((i) => i.revision === s.current_revision)
          return (
            <li key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{s.receipt_no}</p>
                  <p className="text-xs text-gray-600">{person(s.profiles)} · {manila(s.created_at)} · {s.payment_method}</p>
                </div>
                <p className="text-lg font-bold text-green-900">{peso(s.total_centavos)}</p>
              </div>
              <ul className="my-3 space-y-1 text-sm text-gray-800">
                {items.map((i, n) => (
                  <li key={n} className="flex justify-between">
                    <span>{i.quantity} × {i.products?.name}</span>
                    <span>{peso(i.quantity * i.unit_price_centavos)}</span>
                  </li>
                ))}
              </ul>
              {s.notes && <p className="mb-3 text-sm italic text-gray-600">{s.notes}</p>}
              <ApprovalButtons saleId={s.id} isOwn={s.staff_id === user?.id} />
            </li>
          )
        })}
      </ul>

      {edits.length > 0 && <h2 className="mb-2 mt-6 font-semibold text-gray-900">Edit requests</h2>}
      <ul className="space-y-3">
        {edits.map((e) => {
          const sale = e.sale as unknown as EditSale
          const live = sale.sale_items.filter((i) => i.revision === sale.current_revision)
          const before = new Map(live.map((i) => [i.product_id, i]))

          // Merge duplicate lines the same way the database does
          const after = new Map<string, number>()
          for (const i of e.proposed_items as { product_id: string; quantity: number }[])
            after.set(i.product_id, (after.get(i.product_id) ?? 0) + i.quantity)

          const allIds = [...new Set([...before.keys(), ...after.keys()])]
          const rows = allIds.map((id) => {
            const b = before.get(id)
            const unit = b?.unit_price_centavos ?? prod.get(id)?.price_centavos ?? 0
            return { id, name: b?.products?.name ?? prod.get(id)?.name ?? 'Product', was: b?.quantity ?? 0, now: after.get(id) ?? 0, unit }
          })
          const newTotal = rows.reduce((s, r) => s + r.unit * r.now, 0)
          const paymentChanged = e.proposed_payment_method && e.proposed_payment_method !== sale.payment_method

          return (
            <li key={e.id} className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    Edit to <Link href={`/sales/${e.sale_id}`} className="underline">{sale.receipt_no}</Link>
                  </p>
                  <p className="text-xs text-gray-600">{person(e.requester)} · {manila(e.created_at)}</p>
                </div>
                <p className="text-right text-sm text-gray-900">
                  <span className="block text-gray-600 line-through">{peso(sale.total_centavos)}</span>
                  <span className="text-lg font-bold text-green-900">{peso(newTotal)}</span>
                </p>
              </div>
              <p className="mt-2 text-sm text-gray-900"><b>Reason:</b> {e.reason}</p>

              <table className="my-3 w-full text-sm text-gray-900">
                <thead><tr className="border-b border-amber-200 text-left">
                  <th className="py-1">Item</th><th>Was</th><th>Now</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.was === r.now ? 'text-gray-600' : 'font-semibold'}>
                      <td className="py-1">{r.name}</td><td>{r.was}</td><td>{r.now === 0 ? 'removed' : r.now}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paymentChanged && <p className="mb-2 text-sm text-gray-900">Payment: {sale.payment_method} → <b>{e.proposed_payment_method}</b></p>}
              {e.proposed_notes !== null && e.proposed_notes !== sale.notes && (
                <p className="mb-2 text-sm text-gray-900">Notes: “{e.proposed_notes}”</p>
              )}
              <EditRequestButtons requestId={e.id} isOwn={e.requested_by === user?.id} />
            </li>
          )
        })}
      </ul>
    </>
  )
}
