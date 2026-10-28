import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrintButton from './print-button'
import VoidButton from './void-button'

const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)
const manila = (d: string) => new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
const nameOf = (r: unknown) => (r as { full_name: string } | null)?.full_name ?? '—'

type Item = { quantity: number; unit_price_centavos: number; subtotal_centavos: number; revision: number; products: { name: string } | null }

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: s } = await supabase
    .from('sales')
    .select(`id, receipt_no, total_centavos, payment_method, notes, status, approval_status, created_at,
             approved_at, review_note, void_reason, voided_at, current_revision,
             staff:profiles!staff_id(full_name),
             approver:profiles!approved_by(full_name),
             voider:profiles!voided_by(full_name),
             sale_items(quantity, unit_price_centavos, subtotal_centavos, revision, products(name))`)
    .eq('id', id).maybeSingle()
  if (!s) notFound()

  const { data: me } = await supabase.from('profiles').select('role, permissions').eq('id', user!.id).single()
  const canVoid = me?.role === 'admin' || (me?.permissions as { void_sale?: boolean } | null)?.void_sale === true

  const items = (s.sale_items as unknown as Item[]).filter((i) => i.revision === s.current_revision)
  const label = s.status === 'voided' ? 'Voided' : s.approval_status

  return (
    <>
      <div className="mb-3 flex justify-between print:hidden">
        <Link href="/sales" className="text-sm text-green-900 underline">← Back to history</Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <h1 className="text-center text-lg font-bold text-green-900">ID Office</h1>
        <p className="text-center text-sm text-gray-600">Sales receipt</p>
        <div className="my-4 space-y-1 text-sm text-gray-800">
          <p><b>Receipt:</b> {s.receipt_no}</p>
          <p><b>Date:</b> {manila(s.created_at)}</p>
          <p><b>Staff:</b> {nameOf(s.staff)}</p>
          <p><b>Payment:</b> {s.payment_method}</p>
          <p><b>Status:</b> <span className="capitalize">{label}</span></p>
        </div>

        <table className="w-full text-sm text-gray-900">
          <thead><tr className="border-b border-gray-300 text-left">
            <th className="py-1">Item</th><th>Qty</th><th className="text-right">Price</th><th className="text-right">Total</th>
          </tr></thead>
          <tbody>
            {items.map((i, n) => (
              <tr key={n} className="border-b border-gray-100">
                <td className="py-1">{i.products?.name}</td>
                <td>{i.quantity}</td>
                <td className="text-right">{peso(i.unit_price_centavos)}</td>
                <td className="text-right">{peso(i.subtotal_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 flex justify-between text-lg font-bold text-gray-900">
          <span>Total</span><span>{peso(s.total_centavos)}</span>
        </p>

        {s.notes && <p className="mt-3 text-sm italic text-gray-600">Notes: {s.notes}</p>}
        {s.approval_status === 'approved' && <p className="mt-3 text-xs text-gray-600">Approved by {nameOf(s.approver)} on {manila(s.approved_at!)}</p>}
        {s.approval_status === 'rejected' && <p className="mt-3 text-sm text-red-700">Rejected: {s.review_note}</p>}
        {s.status === 'voided' && (
          <p className="mt-3 text-sm text-red-700">Voided by {nameOf(s.voider)} on {manila(s.voided_at!)}: {s.void_reason}</p>
        )}
        {s.approval_status === 'pending' && <p className="mt-3 text-sm text-amber-800">Waiting for approval. This is not final until approved.</p>}
      </article>

      {canVoid && s.approval_status === 'approved' && s.status === 'completed' && (
        <div className="mx-auto mt-4 max-w-md print:hidden"><VoidButton saleId={s.id} /></div>
      )}
    </>
  )
}
