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
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-2">
          <h2 className="mb-1 font-semibold text-gray-900">Backup</h2>
          <p className="mb-3 text-sm text-gray-600">
            Download one file with every product, sale, stock movement and audit entry. Do this every week and before big
            changes, and keep the file somewhere safe, not only on the office computer.
          </p>
          <a href="/settings/backup" className="inline-block rounded-lg bg-green-900 px-5 py-2.5 font-semibold text-white">
            Download full backup
          </a>
        </section>
      </div>
    </>
  )
}
