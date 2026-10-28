import { createClient } from '@/lib/supabase/server'
import NotificationList, { type Row } from './notification-list'

const LABELS: Record<string, string> = {
  sale_pending: 'Needs approval',
  edit_pending: 'Edit needs approval',
  sale_approved: 'Approved',
  sale_rejected: 'Rejected',
  edit_approved: 'Edit approved',
  edit_rejected: 'Edit rejected',
  low_stock: 'Low stock',
  stock_receipt: 'Stock received',
  void: 'Voided',
  sale: 'Sale',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, event, message, sale_id, product_id, read_at, created_at, actor:profiles!actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  const rows: Row[] = (data ?? []).map((n) => ({
    id: n.id,
    label: LABELS[n.event] ?? n.event,
    message: n.message,
    actor: (n.actor as unknown as { full_name: string } | null)?.full_name ?? null,
    when: new Date(n.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
    read: n.read_at !== null,
    href:
      n.event === 'sale_pending' || n.event === 'edit_pending' ? '/approvals'
      : n.sale_id ? `/sales/${n.sale_id}`
      : n.product_id ? '/inventory'
      : null,
  }))

  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-green-900">Notifications</h1>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error.message}</p>}
      <NotificationList rows={rows} />
    </>
  )
}
