import { createClient } from '@/lib/supabase/server'
import PosClient from './pos-client'

export default async function PosPage() {
  const supabase = await createClient()
  const [products, settings] = await Promise.all([
    supabase.from('products').select('id, name, image_url, price_centavos, stock_qty')
      .eq('is_active', true).order('name').limit(500),
    supabase.from('system_settings').select('value').eq('key', 'payment_methods').single(),
  ])
  const methods = Array.isArray(settings.data?.value) ? (settings.data.value as string[]) : ['Cash']

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Record Sale</h1>
      {products.error && <p role="alert" className="mb-3 text-sm text-red-700">{products.error.message}</p>}
      <PosClient products={products.data ?? []} methods={methods} />
    </>
  )
}
