import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const PAGE = 25
const peso = (c: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(c / 100)

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-gray-200 text-gray-800',
  voided: 'bg-red-100 text-red-800',
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()

  let query = supabase
    .from('sales')
    .select('id, receipt_no, total_centavos, payment_method, status, approval_status, created_at, profiles!staff_id(full_name)',
      { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1)

  if (sp.q) query = query.ilike('receipt_no', `%${sp.q.replace(/[%_,]/g, '')}%`)
  if (sp.from) query = query.gte('created_at', `${sp.from}T00:00:00+08:00`)
  if (sp.to) query = query.lte('created_at', `${sp.to}T23:59:59.999+08:00`)
  if (sp.status === 'voided') query = query.eq('status', 'voided')
  else if (sp.status) query = query.eq('approval_status', sp.status).eq('status', 'completed')

  const { data: sales, count, error } = await query
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE))
  const link = (p: number) => {
    const u = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v && k !== 'page') u.set(k, v)
    u.set('page', String(p))
    return `/sales?${u.toString()}`
  }
  const input = 'rounded-lg border border-gray-300 bg-white p-3 text-gray-900'

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Sales History</h1>

      <form className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Receipt no." className={input} />
        <select name="status" defaultValue={sp.status ?? ''} className={input}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="voided">Voided</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from ?? ''} aria-label="From date" className={input} />
        <input type="date" name="to" defaultValue={sp.to ?? ''} aria-label="To date" className={input} />
        <button className="rounded-lg bg-green-900 p-3 font-semibold text-white">Filter</button>
      </form>

      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error.message}</p>}
      {!error && sales?.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          No transactions match these filters.
        </div>
      )}

      <ul className="space-y-2">
        {sales?.map((s) => {
          const label = s.status === 'voided' ? 'voided' : s.approval_status
          const who = (s.profiles as unknown as { full_name: string } | null)?.full_name ?? ''
          return (
            <li key={s.id}>
              <Link href={`/sales/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span>
                  <span className="block font-semibold text-gray-900">{s.receipt_no}</span>
                  <span className="text-xs text-gray-600">
                    {new Date(s.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} · {who} · {s.payment_method}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold text-gray-900">{peso(s.total_centavos)}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[label]}`}>{label}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-800">
          {page > 1 ? <Link href={link(page - 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2">Previous</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2">Next</Link> : <span />}
        </div>
      )}
    </>
  )
}
