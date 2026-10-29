import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin'
import UsersManager, { type UserRow } from './users-manager'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (me?.role !== 'admin') redirect('/')

  const { data: profiles } = await supabase.from('profiles')
    .select('id, full_name, role, is_active, permissions').order('full_name')

  const emails = new Map<string, string>()
  const ready = adminConfigured()
  if (ready) {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 })
    for (const u of data?.users ?? []) emails.set(u.id, u.email ?? '')
  }

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id, email: emails.get(p.id) ?? '', full_name: p.full_name,
    role: p.role, is_active: p.is_active,
    permissions: {
      adjust_stock: !!p.permissions?.adjust_stock, void_sale: !!p.permissions?.void_sale, approve_sale: !!p.permissions?.approve_sale,
    },
    isMe: p.id === user!.id,
  }))

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Users</h1>
      {!ready && (
        <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Adding users and resetting passwords needs the server key <b>SUPABASE_SERVICE_ROLE_KEY</b>, which is not set yet.
          You can still change roles and permissions below.
        </div>
      )}
      <UsersManager users={rows} canManageLogins={ready} />
    </>
  )
}
