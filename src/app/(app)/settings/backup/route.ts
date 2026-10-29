import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// [table, column used for stable paging]
const TABLES: [string, string][] = [
  ['profiles', 'id'], ['courses', 'id'], ['categories', 'id'], ['products', 'id'],
  ['sales', 'id'], ['sale_items', 'id'], ['stock_movements', 'id'],
  ['sale_change_requests', 'id'], ['audit_logs', 'id'], ['system_settings', 'key'],
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return new NextResponse('Admins only', { status: 403 })

  const tables: Record<string, unknown[]> = {}
  for (const [table, key] of TABLES) {
    const rows: unknown[] = []
    for (let page = 0; page < 500; page++) {
      const { data, error } = await supabase.from(table).select('*').order(key).range(page * 1000, page * 1000 + 999)
      if (error) return new NextResponse(`${table}: ${error.message}`, { status: 500 })
      rows.push(...(data ?? []))
      if ((data ?? []).length < 1000) break
    }
    tables[table] = rows
  }

  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), tables }, null, 1), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="id-office-backup-${day}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
