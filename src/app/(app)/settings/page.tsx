import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClassificationManager from './classification-manager'
import PaymentMethods from './payment-methods'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (me?.role !== 'admin') redirect('/')

  const [courses, categories, settings] = await Promise.all([
    supabase.from('courses').select('id, name, is_active').order('name'),
    supabase.from('categories').select('id, name, is_active').order('name'),
    supabase.from('system_settings').select('value').eq('key', 'payment_methods').single(),
  ])
  const methods = Array.isArray(settings.data?.value) ? (settings.data.value as string[]) : ['Cash']

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <ClassificationManager table="courses" title="Courses / departments" items={courses.data ?? []} />
        <ClassificationManager table="categories" title="Product types" items={categories.data ?? []} />
        <PaymentMethods methods={methods} />
      </div>
    </>
  )
}
