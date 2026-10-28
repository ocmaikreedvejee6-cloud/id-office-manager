import { createClient } from '@/lib/supabase/server'
import ApprovalButtons from './approval-buttons'

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)

type Item = { quantity: number; unit_price_centavos: number; revision: number; products: { name: string } | null }

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sales, error } = await supabase
    .from('sales')
    .select(`id, receipt_no, total_centavos, payment_method, notes, created_at, staff_id, current_revision,
             profiles!staff_id(full_name),
             sale_items(quantity, unit_price_centavos, revision, products(name))`)
    .eq('approval_status', 'pending')
    .order('created_at')

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Approvals</h1>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error.message}</p>}
      {!error && sales?.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          Nothing is waiting for approval.
        </div>
      )}
      <ul className="space-y-3">
        {sales?.map((s) => {
          const items = (s.sale_items as unknown as Item[]).filter((i) => i.revision === s.current_revision)
          const who = (s.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Unknown'
          return (
            <li key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{s.receipt_no}</p>
                  <p className="text-xs text-gray-600">
                    {who} · {new Date(s.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} · {s.payment_method}
                  </p>
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
    </>
  )
}
