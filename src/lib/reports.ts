import type { SupabaseClient } from '@supabase/supabase-js'

export type Line = {
  receipt: string; at: string; staff: string; payment: string
  productId: string; product: string; type: string; course: string
  qty: number; price: number; cost: number | null; subtotal: number
}

const ymd = /^\d{4}-\d{2}-\d{2}$/
const validDate = (s?: string) => !!s && ymd.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00+08:00`))
const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
export const manilaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

// All dates are calendar days in Asia/Manila, inclusive on both ends.
export function resolveRange(sp: { range?: string; from?: string; to?: string }) {
  const today = manilaToday()
  let from = today
  let to = today
  if (sp.range === 'yesterday') from = to = addDays(today, -1)
  else if (sp.range === '7d') from = addDays(today, -6)
  else if (sp.range === 'month') from = today.slice(0, 8) + '01'
  else if (sp.range === 'custom' && validDate(sp.from) && validDate(sp.to)) { from = sp.from!; to = sp.to! }
  if (from > to) [from, to] = [to, from]
  return { from, to, range: sp.range ?? 'today' }
}

type Raw = {
  receipt_no: string; created_at: string; payment_method: string; current_revision: number
  staff: { full_name: string } | null
  sale_items: {
    product_id: string; quantity: number; unit_price_centavos: number
    unit_cost_centavos: number | null; subtotal_centavos: number; revision: number
    products: { name: string; categories: { name: string } | null; courses: { name: string } | null } | null
  }[]
}

// Approved, un-voided sales only, using the live revision of each sale.
export async function fetchLines(supabase: SupabaseClient, from: string, to: string): Promise<Line[]> {
  const out: Line[] = []
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase
      .from('sales')
      .select(`receipt_no, created_at, payment_method, current_revision,
               staff:profiles!staff_id(full_name),
               sale_items(product_id, quantity, unit_price_centavos, unit_cost_centavos, subtotal_centavos, revision,
                          products(name, categories(name), courses(name)))`)
      .eq('approval_status', 'approved').eq('status', 'completed')
      .gte('created_at', `${from}T00:00:00+08:00`).lte('created_at', `${to}T23:59:59.999+08:00`)
      .order('created_at').range(page * 1000, page * 1000 + 999)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as Raw[]
    for (const s of rows)
      for (const i of s.sale_items.filter((x) => x.revision === s.current_revision))
        out.push({
          receipt: s.receipt_no, at: s.created_at, staff: s.staff?.full_name ?? '', payment: s.payment_method,
          productId: i.product_id, product: i.products?.name ?? '', type: i.products?.categories?.name ?? 'None',
          course: i.products?.courses?.name ?? 'None', qty: i.quantity, price: i.unit_price_centavos,
          cost: i.unit_cost_centavos, subtotal: i.subtotal_centavos,
        })
    if (rows.length < 1000) break
  }
  return out
}
