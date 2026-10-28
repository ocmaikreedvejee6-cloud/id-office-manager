import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchLines, resolveRange } from '@/lib/reports'

// Stops spreadsheet programs from running a cell as a formula.
const cell = (v: string | number) => {
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const pesos = (c: number) => (c / 100).toFixed(2)

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const sp = req.nextUrl.searchParams
  const { from, to } = resolveRange({ range: 'custom', from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined })

  let lines
  try { lines = await fetchLines(supabase, from, to) }
  catch (e) { return new NextResponse((e as Error).message, { status: 500 }) }

  const head = ['Receipt', 'Date (Asia/Manila)', 'Staff', 'Payment', 'Product', 'Type', 'Course', 'Qty', 'Unit price', 'Unit cost', 'Subtotal']
  const rows = lines.map((l) => [
    l.receipt, new Date(l.at).toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }), l.staff, l.payment,
    l.product, l.type, l.course, l.qty, pesos(l.price), l.cost === null ? '' : pesos(l.cost), pesos(l.subtotal),
  ])
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales_${from}_to_${to}.csv"`,
    },
  })
}
