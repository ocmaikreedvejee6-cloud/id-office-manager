import { createClient } from '@/lib/supabase/server'
import ProductForm from './product-form'

export default async function NewProductPage() {
  const supabase = await createClient()
  const [cats, courses] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('courses').select('id, name').eq('is_active', true).order('name'),
  ])
  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Add product</h1>
      <ProductForm categories={cats.data ?? []} courses={courses.data ?? []} />
    </>
  )
}
