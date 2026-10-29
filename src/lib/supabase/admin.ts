import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Uses the secret key. Server code only: never import this from a client component.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export const adminConfigured = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY
