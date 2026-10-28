import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditForm from './edit-form'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [product, cats, courses, me] = await Promise.all([
    supabase.from('products')
      .select('id, name, sku, image_url, category_id, course_id, price_centavos, cost_centavos, low_stock_threshold')
      .eq('id', id).maybeSingle(),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('courses').select('id, name').eq('is_active', true).order('name'),
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
  ])
  if (!product.data) notFound()

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Edit product</h1>
      <EditForm product={product.data} categories={cats.data ?? []} courses={courses.data ?? []}
        isAdmin={me.data?.role === 'admin'} />
    </>
  )
}
