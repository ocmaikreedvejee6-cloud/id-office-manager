'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Result = { ok: true } | { ok: false; error: string }
type Role = 'admin' | 'supervisor'
type Perms = { adjust_stock: boolean; void_sale: boolean; approve_sale: boolean }

const DEFAULTS: Record<Role, Perms> = {
  admin: { adjust_stock: true, void_sale: true, approve_sale: true },
  supervisor: { adjust_stock: true, void_sale: false, approve_sale: false },
}
const MISSING_KEY = 'The server has no SUPABASE_SERVICE_ROLE_KEY yet. Follow the setup steps, then redeploy.'

// Every action re-checks on the server that the caller is an active admin.
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single()
  return me?.role === 'admin' && me.is_active ? user : null
}

function adminDb() {
  try { return createAdminClient() } catch { return null }
}

export async function createUser(input: { email: string; fullName: string; role: Role; password: string }): Promise<Result> {
  const me = await requireAdmin()
  if (!me) return { ok: false, error: 'Only administrators can add users.' }

  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' }
  if (!fullName) return { ok: false, error: 'Enter the person’s full name.' }
  if (input.role !== 'admin' && input.role !== 'supervisor') return { ok: false, error: 'Choose a role.' }
  if (input.password.length < 8) return { ok: false, error: 'The password needs at least 8 characters.' }

  const db = adminDb()
  if (!db) return { ok: false, error: MISSING_KEY }

  const { data, error } = await db.auth.admin.createUser({ email, password: input.password, email_confirm: true })
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Could not create the login.' }

  const { error: profileError } = await db.from('profiles').insert({
    id: data.user.id, full_name: fullName, role: input.role, permissions: DEFAULTS[input.role],
  })
  if (profileError) {
    await db.auth.admin.deleteUser(data.user.id) // do not leave a login with no profile
    return { ok: false, error: profileError.message }
  }
  await db.from('audit_logs').insert({
    actor_id: me.id, action: 'create_user', entity: 'user', entity_id: data.user.id, details: { email, role: input.role },
  })
  revalidatePath('/users')
  return { ok: true }
}

export async function resetPassword(userId: string, password: string): Promise<Result> {
  const me = await requireAdmin()
  if (!me) return { ok: false, error: 'Only administrators can reset passwords.' }
  if (password.length < 8) return { ok: false, error: 'The password needs at least 8 characters.' }

  const db = adminDb()
  if (!db) return { ok: false, error: MISSING_KEY }
  const { error } = await db.auth.admin.updateUserById(userId, { password })
  if (error) return { ok: false, error: error.message }

  // The password itself is never logged.
  await db.from('audit_logs').insert({ actor_id: me.id, action: 'reset_password', entity: 'user', entity_id: userId })
  return { ok: true }
}

export async function updateUser(userId: string, changes: { role: Role; is_active: boolean; permissions: Perms }): Promise<Result> {
  const me = await requireAdmin()
  if (!me) return { ok: false, error: 'Only administrators can change users.' }
  if (changes.role !== 'admin' && changes.role !== 'supervisor') return { ok: false, error: 'Choose a role.' }

  const stillAdmin = changes.role === 'admin' && changes.is_active
  if (userId === me.id && !stillAdmin) return { ok: false, error: 'You cannot remove your own admin access.' }

  const db = adminDb()
  if (!db) return { ok: false, error: MISSING_KEY }

  if (!stillAdmin) {
    const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
      .eq('role', 'admin').eq('is_active', true).neq('id', userId)
    if (!count) return { ok: false, error: 'There must be at least one active administrator.' }
  }

  const { error } = await db.from('profiles').update({
    role: changes.role, is_active: changes.is_active,
    permissions: { adjust_stock: !!changes.permissions.adjust_stock, void_sale: !!changes.permissions.void_sale, approve_sale: !!changes.permissions.approve_sale },
  }).eq('id', userId)
  if (error) return { ok: false, error: error.message }

  await db.from('audit_logs').insert({ actor_id: me.id, action: 'update_user', entity: 'user', entity_id: userId, details: changes })
  revalidatePath('/users')
  return { ok: true }
}
