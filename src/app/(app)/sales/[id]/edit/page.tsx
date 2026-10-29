import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditSaleForm from './edit-sale-form'

type Item = { product_id: string; quantity: number; unit_price_centavos: number; revision: number; products: { name: string } | null }

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: s } = await supabase
    .from('sales')
    .select(`id, receipt_no, payment_method, notes, status, approval_status, current_revision,
             sale_items(product_id, quantity, unit_price_centavos, revision, products(name))`)
    .eq('id', id).maybeSingle()
  if (!s) notFound()
  if (s.approval_status !== 'approved' || s.status !== 'completed') redirect(`/sales/${id}`)

  const { data: pending } = await supabase
    .from('sale_change_requests').select('id').eq('sale_id', id).eq('status', 'pending').maybeSingle()
  if (pending) redirect(`/sales/${id}`)

  const [products, settings] = await Promise.all([
    supabase.from('products').select('id, name, price_centavos, stock_qty').eq('is_active', true).order('name'),
    supabase.from('system_settings').select('value').eq('key', 'payment_methods').single(),
  ])
  const methods = Array.isArray(settings.data?.value) ? (settings.data.value as string[]) : [s.payment_method]
  if (!methods.includes(s.payment_method)) methods.push(s.payment_method)

  const lines = (s.sale_items as unknown as Item[])
    .filter((i) => i.revision === s.current_revision)
    .map((i) => ({ product_id: i.product_id, name: i.products?.name ?? 'Product', quantity: i.quantity, unit_price_centavos: i.unit_price_centavos }))

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-green-900">Request an edit</h1>
      <p className="mb-4 text-sm text-gray-600">
        {s.receipt_no} stays as it is until another account approves the change. Stock only moves by the difference.
      </p>
      <EditSaleForm saleId={s.id} payment={s.payment_method} notes={s.notes} lines={lines}
        products={products.data ?? []} methods={methods} />
    </>
  )
}
